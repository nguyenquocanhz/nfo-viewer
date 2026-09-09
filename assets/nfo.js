/*!
 * nfo-viewer — doc file sidecar .nfo (Kodi / Jellyfin / Emby)
 * Copyright (C) 2026  nguyenquocanhz — GPL-3.0-or-later
 *
 * Phan doc va chuan hoa. Khong dung DOM cua trang, khong dung bien toan cuc
 * ngoai `NFO`, de vua chay trong app vua chay trong trang test.
 */
(function (global) {
  "use strict";

  /** Cac the goc ma Kodi dung. Moi loai co y nghia khac nhau nen giu lai. */
  var ROOTS = {
    movie: "Phim / video",
    musicvideo: "Video nhac",
    episodedetails: "Tap phim",
    tvshow: "Bo phim",
    album: "Album nhac",
    artist: "Nghe si"
  };

  /** Ten mien -> ten hien thi. Chi de doc cho de, khong anh huong du lieu. */
  var STUDIOS = {
    douyin: "Douyin", tiktok: "TikTok", youtube: "YouTube",
    facebook: "Facebook", instagram: "Instagram", threads: "Threads",
    bilibili: "bilibili", ixigua: "Xigua", toutiao: "Toutiao"
  };

  function text(node, tag) {
    if (!node) return null;
    var el = node.querySelector(":scope > " + tag);
    if (!el) return null;
    var v = (el.textContent || "").trim();
    return v === "" ? null : v;
  }

  function num(node, tag) {
    var v = text(node, tag);
    if (v === null) return null;
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function all(node, tag) {
    if (!node) return [];
    return Array.prototype.map
      .call(node.querySelectorAll(":scope > " + tag), function (el) {
        return (el.textContent || "").trim();
      })
      .filter(function (v) { return v !== ""; });
  }

  /**
   * Ngay thang trong NFO khong nhat quan: <premiered> la ISO, <dateadded> co
   * ca gio, <year> chi co nam. Tra ve chuoi ISO ngan nhat doc duoc, hoac null.
   */
  function readDate(root) {
    var raw = text(root, "premiered") || text(root, "aired") ||
              text(root, "releasedate") || text(root, "dateadded");
    if (raw) {
      var m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return m[0];
      var d = new Date(raw);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    var y = num(root, "year");
    return y ? String(y) : null;
  }

  /** <runtime> cua Kodi tinh bang PHUT. streamdetails thi bang giay. */
  function readDuration(root, video) {
    var secs = video && video.durationinseconds;
    if (secs) return secs;
    var mins = num(root, "runtime");
    return mins ? mins * 60 : null;
  }

  function readStream(details, tag) {
    if (!details) return null;
    var el = details.querySelector(":scope > " + tag);
    if (!el) return null;
    var out = {
      codec: text(el, "codec"),
      width: num(el, "width"),
      height: num(el, "height"),
      aspect: num(el, "aspect"),
      framerate: num(el, "framerate"),
      durationinseconds: num(el, "durationinseconds"),
      channels: num(el, "channels"),
      samplingrate: num(el, "samplingrate"),
      bitrate: num(el, "bitrate"),
      language: text(el, "language")
    };
    var co = Object.keys(out).some(function (k) { return out[k] !== null; });
    return co ? out : null;
  }

  function readPeople(root) {
    return Array.prototype.map
      .call(root.querySelectorAll(":scope > actor"), function (el) {
        return {
          name: text(el, "name"),
          role: text(el, "role"),
          thumb: text(el, "thumb"),
          profile: text(el, "profile")
        };
      })
      .filter(function (p) { return p.name; });
  }

  function readIds(root) {
    return Array.prototype.map
      .call(root.querySelectorAll(":scope > uniqueid"), function (el) {
        return {
          type: el.getAttribute("type") || "?",
          value: (el.textContent || "").trim(),
          isDefault: el.getAttribute("default") === "true"
        };
      })
      .filter(function (u) { return u.value; });
  }

  /**
   * Doc mot chuoi XML .nfo.
   * Tra ve { ok: true, data } hoac { ok: false, error } - khong nem loi, vi
   * nguoi dung tha ca thu muc vao thi mot file hong khong duoc lam dung ca me.
   */
  function parse(xmlText, filename) {
    filename = filename || "(khong ten)";
    if (typeof xmlText !== "string" || xmlText.trim() === "") {
      return { ok: false, filename: filename, error: "File rong." };
    }

    var doc;
    try {
      doc = new DOMParser().parseFromString(xmlText, "application/xml");
    } catch (e) {
      return { ok: false, filename: filename, error: "Khong doc duoc XML." };
    }

    var bad = doc.querySelector("parsererror");
    if (bad) {
      var why = (bad.textContent || "").split("\n")[0].trim();
      return {
        ok: false, filename: filename,
        error: "XML hong" + (why ? ": " + why.slice(0, 120) : ".")
      };
    }

    var root = doc.documentElement;
    if (!root) {
      return { ok: false, filename: filename, error: "Khong co the goc." };
    }
    var kind = root.nodeName.toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(ROOTS, kind)) {
      return {
        ok: false, filename: filename,
        error: "The goc <" + kind + "> khong phai dinh dang .nfo cua Kodi."
      };
    }

    var details = root.querySelector(":scope > fileinfo > streamdetails");
    var video = readStream(details, "video");
    var audio = readStream(details, "audio");
    var source = text(root, "source");
    var studio = text(root, "studio");

    return {
      ok: true,
      filename: filename,
      data: {
        kind: kind,
        kindLabel: ROOTS[kind],
        title: text(root, "title") || text(root, "originaltitle"),
        originalTitle: text(root, "originaltitle"),
        plot: text(root, "plot") || text(root, "outline"),
        date: readDate(root),
        duration: readDuration(root, video),
        studio: studio || (source ? (STUDIOS[source] || source) : null),
        source: source,
        url: text(root, "url") || text(root, "trailer"),
        author: text(root, "director") || text(root, "artist"),
        thumb: text(root, "thumb"),
        genres: all(root, "genre"),
        tags: all(root, "tag"),
        people: readPeople(root),
        ids: readIds(root),
        video: video,
        audio: audio,
        license: text(root, "license"),
        generatedBy: text(root, "generated_by"),
        originalFilename: text(root, "original_filename"),
        stats: readStats(root),
        raw: xmlText
      }
    };
  }

  /** Cac the <stat_*> la phan rieng, Kodi bo qua chung. Gom lai de hien. */
  function readStats(root) {
    var out = [];
    Array.prototype.forEach.call(root.children, function (el) {
      var n = el.nodeName.toLowerCase();
      if (n.indexOf("stat_") === 0) {
        var v = (el.textContent || "").trim();
        if (v) out.push({ name: n.slice(5), value: v });
      }
    });
    return out;
  }

  // ---------------------------------------------------------------- dinh dang

  function fmtDuration(secs) {
    if (!secs && secs !== 0) return null;
    secs = Math.round(secs);
    var h = Math.floor(secs / 3600);
    var m = Math.floor((secs % 3600) / 60);
    var s = secs % 60;
    var pad = function (n) { return n < 10 ? "0" + n : String(n); };
    return h > 0 ? h + ":" + pad(m) + ":" + pad(s) : m + ":" + pad(s);
  }

  /** Bitrate trong NFO ghi bang bit/giay; nguoi doc quen kbps. */
  function fmtBitrate(bps) {
    if (!bps) return null;
    return Math.round(bps / 1000) + " kbps";
  }

  function fmtRate(hz) {
    if (!hz) return null;
    return (hz / 1000).toFixed(1).replace(/\.0$/, "") + " kHz";
  }

  function fmtChannels(n) {
    if (!n) return null;
    if (n === 1) return "mono";
    if (n === 2) return "stereo";
    return n + " kênh";
  }

  /** Mot dong tom tat luong hinh, vd "h264 · 1080×1920 · 30 fps". */
  function videoLine(v) {
    if (!v) return null;
    var bits = [];
    if (v.codec) bits.push(v.codec);
    if (v.width && v.height) bits.push(v.width + "×" + v.height);
    if (v.framerate) bits.push(Math.round(v.framerate * 100) / 100 + " fps");
    return bits.length ? bits.join(" · ") : null;
  }

  function audioLine(a) {
    if (!a) return null;
    var bits = [];
    if (a.codec) bits.push(a.codec);
    var br = fmtBitrate(a.bitrate); if (br) bits.push(br);
    var sr = fmtRate(a.samplingrate); if (sr) bits.push(sr);
    var ch = fmtChannels(a.channels); if (ch) bits.push(ch);
    return bits.length ? bits.join(" · ") : null;
  }

  /**
   * Nhung thu THIEU so voi mot sidecar day du. Day la gia tri chinh cua app:
   * biet file nao thieu gi de con bo sung, thay vi mo tung file ra doc.
   */
  function missing(d) {
    var out = [];
    if (!d.title) out.push("tiêu đề");
    if (!d.date) out.push("ngày đăng");
    if (!d.author) out.push("tác giả");
    if (!d.plot) out.push("mô tả");
    if (!d.tags.length && !d.genres.length) out.push("hashtag");
    if (!d.video) out.push("thông số hình");
    if (!d.audio) out.push("thông số tiếng");
    if (!d.ids.length) out.push("mã định danh");
    return out;
  }

  var NFO = {
    ROOTS: ROOTS,
    parse: parse,
    fmtDuration: fmtDuration,
    fmtBitrate: fmtBitrate,
    fmtRate: fmtRate,
    fmtChannels: fmtChannels,
    videoLine: videoLine,
    audioLine: audioLine,
    missing: missing
  };

  if (typeof module !== "undefined" && module.exports) module.exports = NFO;
  global.NFO = NFO;
})(typeof window !== "undefined" ? window : globalThis);
