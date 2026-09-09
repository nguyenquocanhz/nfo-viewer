/*!
 * nfo-viewer — giao dien
 * Copyright (C) 2026  nguyenquocanhz — GPL-3.0-or-later
 */
(function () {
  "use strict";

  var $ = function (sel) { return document.querySelector(sel); };
  var rows = [];          // { filename, ok, error, data, sample }
  var selected = null;    // chi so trong `rows`
  var sortKey = "title";
  var sortAsc = true;
  var query = "";

  // ------------------------------------------------------------ doc file

  function addResult(res, isSample) {
    res.sample = !!isSample;
    // Cung ten file thi thay the, khong chat them ban trung
    var i = rows.findIndex(function (r) { return r.filename === res.filename; });
    if (i >= 0) rows[i] = res; else rows.push(res);
  }

  function readFiles(fileList) {
    var files = Array.prototype.filter.call(fileList, function (f) {
      return /\.nfo$/i.test(f.name);
    });
    if (!files.length) {
      flash("Không thấy file .nfo nào trong những gì bạn thả vào.");
      return;
    }
    var remaining = files.length;
    files.forEach(function (file) {
      var reader = new FileReader();
      reader.onload = function () {
        addResult(NFO.parse(String(reader.result), file.name), false);
        if (--remaining === 0) { selected = null; render(); }
      };
      reader.onerror = function () {
        addResult({ ok: false, filename: file.name, error: "Không đọc được file." }, false);
        if (--remaining === 0) { selected = null; render(); }
      };
      reader.readAsText(file, "utf-8");
    });
  }

  var flashTimer = null;
  function flash(msg) {
    var el = $("#flash");
    el.textContent = msg;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { el.textContent = ""; }, 4000);
  }

  // ------------------------------------------------------------ sap xep, loc

  function sortValue(r, key) {
    if (!r.ok) return key === "title" ? r.filename : "";
    var d = r.data;
    switch (key) {
      case "title":    return (d.title || r.filename).toLowerCase();
      case "studio":   return (d.studio || "").toLowerCase();
      case "date":     return d.date || "";
      case "duration": return d.duration || 0;
      case "missing":  return NFO.missing(d).length;
      default:         return "";
    }
  }

  function visibleRows() {
    var q = query.trim().toLowerCase();
    var out = rows.filter(function (r) {
      if (!q) return true;
      if (r.filename.toLowerCase().indexOf(q) >= 0) return true;
      if (!r.ok) return false;
      var d = r.data;
      var hay = [d.title, d.studio, d.author, d.plot,
                 (d.tags || []).join(" "), (d.genres || []).join(" ")]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.indexOf(q) >= 0;
    });
    out.sort(function (a, b) {
      var va = sortValue(a, sortKey), vb = sortValue(b, sortKey);
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return out;
  }

  // ------------------------------------------------------------ ve bang

  var COLS = [
    { key: "title",    label: "Tiêu đề" },
    { key: "studio",   label: "Nền tảng" },
    { key: "date",     label: "Ngày đăng" },
    { key: "duration", label: "Dài" },
    { key: "missing",  label: "Trạng thái" }
  ];

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function statusPill(r) {
    if (!r.ok) return el("span", { class: "pill err", text: "Không đọc được" });
    var miss = NFO.missing(r.data);
    if (!miss.length) return el("span", { class: "pill ok", text: "Đầy đủ" });
    return el("span", { class: "pill warn", text: "Thiếu " + miss.length + " mục" });
  }

  function renderTable() {
    var list = visibleRows();
    var tbody = el("tbody", {});

    list.forEach(function (r) {
      var idx = rows.indexOf(r);
      var d = r.ok ? r.data : null;
      var title = el("td", { class: "name" }, [
        document.createTextNode(d && d.title ? d.title : r.filename),
        el("small", { text: r.filename + (r.sample ? "  · mẫu" : "") })
      ]);
      var tr = el("tr", {
        "aria-selected": String(idx === selected),
        tabindex: "0",
        onclick: function () { selected = idx; render(); },
        onkeydown: function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selected = idx; render(); }
        }
      }, [
        title,
        el("td", { text: d && d.studio ? d.studio : "—" }),
        el("td", { class: "num", text: d && d.date ? d.date : "—" }),
        el("td", { class: "num", text: d && NFO.fmtDuration(d.duration) || "—" }),
        el("td", {}, [statusPill(r)])
      ]);
      tbody.appendChild(tr);
    });

    var thead = el("thead", {}, [
      el("tr", {}, COLS.map(function (c) {
        var arrow = sortKey === c.key
          ? el("span", { class: "arrow", text: sortAsc ? " ▲" : " ▼" }) : null;
        return el("th", {
          scope: "col",
          "aria-sort": sortKey === c.key ? (sortAsc ? "ascending" : "descending") : "none",
          onclick: function () {
            if (sortKey === c.key) sortAsc = !sortAsc;
            else { sortKey = c.key; sortAsc = true; }
            render();
          }
        }, [document.createTextNode(c.label), arrow]);
      }))
    ]);

    var wrap = $("#tablewrap");
    wrap.replaceChildren();
    if (!rows.length) {
      wrap.appendChild(el("div", { class: "empty",
        text: "Chưa có file nào. Thả file .nfo vào khung phía trên." }));
    } else if (!list.length) {
      wrap.appendChild(el("div", { class: "empty",
        text: "Không có file nào khớp “" + query + "”." }));
    } else {
      wrap.appendChild(el("table", {}, [thead, tbody]));
    }
    $("#count").textContent = list.length + "/" + rows.length;
  }

  // ------------------------------------------------------------ ve chi tiet

  function field(label, value) {
    var dd = value
      ? el("dd", { text: String(value) })
      : el("dd", { class: "none", text: "không có" });
    return el("div", { class: "field" }, [el("dt", { text: label }), dd]);
  }

  /**
   * Khung anh. Anh trong .nfo la link toi CDN cua nen tang, nen rat hay chet:
   * link het han, CDN chan hotlink, hoac may dang offline. Truong hop do phai
   * hien ro la "khong tai duoc" kem link bam duoc, chu khong de o trong.
   */
  function gallery(d) {
    var wrap = el("div", { class: "block" }, [
      el("h3", { text: d.isImagePost
        ? "Ảnh trong bài (" + d.images.length + ")"
        : "Ảnh bìa" })
    ]);
    var grid = el("div", { class: "gallery" });

    d.images.forEach(function (img, i) {
      var cell = el("figure", { class: "shot" });
      var ph = el("div", { class: "ph", text: "đang tải…" });
      var im = el("img", {
        src: img.url, alt: (d.title || "ảnh") + " — " + (i + 1),
        loading: "lazy", referrerpolicy: "no-referrer"
      });
      im.addEventListener("load", function () { ph.remove(); });
      im.addEventListener("error", function () {
        im.remove();
        ph.replaceChildren(
          el("span", { class: "ph-x", text: "không tải được" }),
          el("a", { href: img.url, target: "_blank", rel: "noreferrer noopener",
                    class: "ph-link", text: "mở link" })
        );
      });
      cell.appendChild(ph);
      cell.appendChild(im);
      if (img.aspect) cell.appendChild(el("figcaption", { text: img.aspect }));
      grid.appendChild(cell);
    });

    wrap.appendChild(grid);
    return wrap;
  }

  function renderDetail() {
    var box = $("#detail");
    box.replaceChildren();

    if (selected === null || !rows[selected]) {
      box.appendChild(el("div", { class: "empty",
        text: "Chọn một dòng bên trái để xem chi tiết." }));
      return;
    }

    var r = rows[selected];
    if (!r.ok) {
      box.appendChild(el("h2", { text: r.filename }));
      box.appendChild(el("div", { class: "err-detail", text: r.error }));
      return;
    }

    var d = r.data;
    box.appendChild(el("h2", { text: d.title || r.filename }));

    var sub = el("div", { class: "sub" }, [
      el("span", { class: "pill ok", text: d.kindLabel }),
      d.studio ? el("span", { text: d.studio }) : null,
      d.author ? el("span", { text: "· " + d.author }) : null,
      d.date ? el("span", { text: "· " + d.date }) : null,
      d.duration ? el("span", { text: "· " + NFO.fmtDuration(d.duration) }) : null
    ]);
    box.appendChild(sub);

    if (d.plot) box.appendChild(el("p", { class: "plot", text: d.plot }));

    if (d.images.length) box.appendChild(gallery(d));

    var miss = NFO.missing(d);
    if (miss.length) {
      box.appendChild(el("div", { class: "block" }, [
        el("h3", { text: "Thiếu so với sidecar đầy đủ" }),
        el("div", { class: "missing-list" }, miss.map(function (m) {
          return el("span", { class: "tag", text: m });
        }))
      ]));
    }

    if (!d.isImagePost) box.appendChild(el("div", { class: "block" }, [
      el("h3", { text: "Luồng hình" }),
      el("dl", { class: "grid2" }, [
        field("Codec", d.video && d.video.codec),
        field("Độ phân giải", d.video && d.video.width && d.video.height
          ? d.video.width + "×" + d.video.height : null),
        field("Khung hình", d.video && d.video.framerate ? d.video.framerate + " fps" : null),
        field("Thời lượng", NFO.fmtDuration(d.duration))
      ])
    ]));

    if (!d.isImagePost) box.appendChild(el("div", { class: "block" }, [
      el("h3", { text: "Luồng tiếng" }),
      el("dl", { class: "grid2" }, [
        field("Codec", d.audio && d.audio.codec),
        field("Bitrate", d.audio && NFO.fmtBitrate(d.audio.bitrate)),
        field("Tần số", d.audio && NFO.fmtRate(d.audio.samplingrate)),
        field("Kênh", d.audio && NFO.fmtChannels(d.audio.channels))
      ])
    ]));

    if (d.tags.length || d.genres.length) {
      box.appendChild(el("div", { class: "block" }, [
        el("h3", { text: "Thẻ" }),
        el("div", { class: "tags" },
          // <genre> thuong lap lai the dau tien cua <tag>. Hien ca hai thi nguoi
          // doc tuong app bi loi, nen the nao da la genre thi khong hien lai.
          d.genres.map(function (g) { return el("span", { class: "tag genre", text: g }); })
            .concat(d.tags
              .filter(function (t) { return d.genres.indexOf(t) < 0; })
              .map(function (t) { return el("span", { class: "tag", text: t }); })))
      ]));
    }

    var idRows = d.ids.map(function (u) {
      return field(u.type + (u.isDefault ? " (chính)" : ""), u.value);
    });
    if (d.stats.length) {
      d.stats.forEach(function (s) { idRows.push(field(s.name, s.value)); });
    }
    if (idRows.length || d.url) {
      box.appendChild(el("div", { class: "block" }, [
        el("h3", { text: "Định danh và nguồn" }),
        el("dl", { class: "grid2" }, idRows.concat([field("Link gốc", d.url)]))
      ]));
    }

    if (d.people.length) {
      box.appendChild(el("div", { class: "block" }, [
        el("h3", { text: "Người liên quan" }),
        el("dl", { class: "grid2" }, d.people.map(function (p) {
          return field(p.role || "Người", p.name);
        }))
      ]));
    }

    var raw = el("details", { class: "raw" }, [
      el("summary", { text: "Xem XML gốc" }),
      el("pre", { text: d.raw })
    ]);
    box.appendChild(raw);
  }

  function render() { renderTable(); renderDetail(); }

  // ------------------------------------------------------------ xuat

  function exportJson() {
    var out = rows.filter(function (r) { return r.ok; }).map(function (r) {
      var d = Object.assign({}, r.data);
      delete d.raw;                       // bo XML tho cho file gon
      d.filename = r.filename;
      d.missing = NFO.missing(r.data);
      return d;
    });
    download("nfo-export.json", JSON.stringify(out, null, 2), "application/json");
  }

  function csvCell(v) {
    var s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function exportCsv() {
    var head = ["file", "tieu_de", "nen_tang", "tac_gia", "ngay_dang", "thoi_luong_giay",
                "video_codec", "rong", "cao", "fps",
                "audio_codec", "bitrate_bps", "tan_so_hz", "so_kenh",
                "the", "thieu"];
    var lines = [head.join(",")];
    rows.filter(function (r) { return r.ok; }).forEach(function (r) {
      var d = r.data, v = d.video || {}, a = d.audio || {};
      lines.push([
        r.filename, d.title, d.studio, d.author, d.date, d.duration,
        v.codec, v.width, v.height, v.framerate,
        a.codec, a.bitrate, a.samplingrate, a.channels,
        d.genres.concat(d.tags).join(" "), NFO.missing(d).join(" ")
      ].map(csvCell).join(","));
    });
    download("nfo-export.csv", "﻿" + lines.join("\r\n"), "text/csv");
  }

  function download(name, body, type) {
    var blob = new Blob([body], { type: type + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ------------------------------------------------------------ khoi tao

  function bind() {
    var dz = $("#dropzone");
    ["dragenter", "dragover"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) {
        e.preventDefault(); dz.classList.add("hot");
      });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) {
        e.preventDefault(); dz.classList.remove("hot");
      });
    });
    dz.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files) readFiles(e.dataTransfer.files);
    });
    // Tha ra ngoai khung ma trinh duyet mo file thi mat sach - chan lai
    ["dragover", "drop"].forEach(function (ev) {
      window.addEventListener(ev, function (e) { e.preventDefault(); });
    });

    $("#picker").addEventListener("change", function (e) {
      readFiles(e.target.files); e.target.value = "";
    });
    $("#pickbtn").addEventListener("click", function () { $("#picker").click(); });
    $("#clear").addEventListener("click", function () {
      rows = []; selected = null; render();
    });
    $("#json").addEventListener("click", exportJson);
    $("#csv").addEventListener("click", exportCsv);
    $("#search").addEventListener("input", function (e) {
      query = e.target.value; render();
    });
    $("#theme").addEventListener("click", function () {
      var now = document.documentElement.getAttribute("data-theme");
      var next = now === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
    });
  }

  function loadSamples() {
    if (typeof SAMPLES === "undefined") return;
    Object.keys(SAMPLES).forEach(function (name) {
      addResult(NFO.parse(SAMPLES[name], name), true);
    });
    // Mo len chon san mot mau DAY DU va CO ANH, de nguoi mo lan dau thay ngay
    // app lam duoc gi, thay vi roi vao mot file thieu du lieu.
    selected = rows.findIndex(function (r) {
      return r.ok && r.data.images.length && NFO.missing(r.data).length === 0;
    });
    if (selected < 0) selected = rows.findIndex(function (r) { return r.ok; });
    if (selected < 0) selected = null;
  }

  bind();
  loadSamples();
  render();
})();
