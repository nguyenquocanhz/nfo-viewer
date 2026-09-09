/*!
 * nfo-viewer — kiem thu phan doc. GPL-3.0-or-later
 *
 * Chay trong trinh duyet vi NFO.parse dung DOMParser. Mo tests/test.html.
 */
(function () {
  "use strict";

  var pass = 0, fail = 0;
  var out = document.getElementById("out");

  function section(name) {
    var h = document.createElement("h2");
    h.textContent = name;
    out.appendChild(h);
  }

  function check(label, ok, extra) {
    (ok ? pass++ : fail++);
    var d = document.createElement("div");
    d.className = "case";
    d.innerHTML = '<span class="' + (ok ? "ok" : "bad") + '">' +
      (ok ? "PASS" : "FAIL") + "</span> " + escapeHtml(label) +
      (extra ? ' <span class="why">→ ' + escapeHtml(String(extra)) + "</span>" : "");
    out.appendChild(d);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function xml(body) {
    return '<?xml version="1.0" encoding="UTF-8"?>' + body;
  }

  // ------------------------------------------------------------------ 1

  section("1. File mau di kem doc duoc");

  var tiktok = NFO.parse(SAMPLES["tiktok-chieu-ha-noi.nfo"], "tiktok.nfo");
  check("doc duoc file TikTok", tiktok.ok, tiktok.error);
  if (tiktok.ok) {
    var d = tiktok.data;
    check("tieu de co dau tieng Viet", d.title === "Chiều Hà Nội", d.title);
    check("nen tang", d.studio === "TikTok", d.studio);
    check("ngay dang", d.date === "2026-03-14", d.date);
    check("tac gia", d.author === "Quốc Anh", d.author);
    check("thoi luong lay tu streamdetails (23s) chu khong phai runtime (1 phut)",
          d.duration === 23, d.duration);
    check("codec hinh", d.video && d.video.codec === "h264");
    check("do phan giai", d.video && d.video.width === 1080 && d.video.height === 1920);
    check("bitrate tieng doc tu bit/giay", d.audio && d.audio.bitrate === 128000);
    check("hai the tag", d.tags.length === 2, d.tags.join(","));
    check("uniqueid chinh", d.ids.length === 1 && d.ids[0].isDefault === true);
    check("loai uniqueid", d.ids[0] && d.ids[0].type === "tiktok", d.ids[0] && d.ids[0].type);
    check("the stat_* duoc gom rieng", d.stats.length === 2,
          d.stats.map(function (s) { return s.name; }).join(","));
    check("link goc", (d.url || "").indexOf("tiktok.com") > 0);
    check("khong thieu muc nao", NFO.missing(d).length === 0,
          NFO.missing(d).join(", "));
  }

  var yt = NFO.parse(SAMPLES["youtube-big-buck-bunny.nfo"], "yt.nfo");
  check("doc duoc file YouTube", yt.ok, yt.error);
  if (yt.ok) {
    check("thoi luong 635 giay", yt.data.duration === 635, yt.data.duration);
    check("4 the tag", yt.data.tags.length === 4, yt.data.tags.join(","));
  }

  var bili = NFO.parse(SAMPLES["bilibili-hires-flac.nfo"], "bili.nfo");
  check("doc duoc file bilibili", bili.ok, bili.error);
  if (bili.ok) {
    check("the goc <musicvideo>", bili.data.kind === "musicvideo", bili.data.kind);
    check("nhan loai doc duoc", bili.data.kindLabel === "Video nhạc" ||
          bili.data.kindLabel.length > 0, bili.data.kindLabel);
    check("codec tieng flac", bili.data.audio && bili.data.audio.codec === "flac");
    check("chu Trung trong tieu de giu nguyen",
          bili.data.title.indexOf("诡异复苏") > 0);
    check("dau & trong mo ta duoc giai ma",
          (bili.data.plot || "").indexOf("&") > 0, bili.data.plot);
  }

  // ------------------------------------------------------------------ 2

  section("2. File thieu du lieu / hong");

  var thieu = NFO.parse(SAMPLES["kodi-thieu-du-lieu.nfo"], "thieu.nfo");
  check("van doc duoc file thieu du lieu", thieu.ok, thieu.error);
  if (thieu.ok) {
    check("the goc <episodedetails> duoc chap nhan",
          thieu.data.kind === "episodedetails", thieu.data.kind);
    check("thoi luong lui ve runtime (24 phut = 1440 giay)",
          thieu.data.duration === 1440, thieu.data.duration);
    check("khong co ngay -> null", thieu.data.date === null, thieu.data.date);
    var m = NFO.missing(thieu.data);
    check("bao thieu ngay dang", m.indexOf("ngày đăng") >= 0, m.join(", "));
    check("bao thieu thong so tieng", m.indexOf("thông số tiếng") >= 0);
    // 7 muc: ngay dang, tac gia, mo ta, hashtag, thong so hinh,
    // thong so tieng, ma dinh danh. File mau chi co title va runtime.
    check("bao dung so muc thieu", m.length === 7, m.length + ": " + m.join(", "));
  }

  var hong = NFO.parse(SAMPLES["hong-khong-doc-duoc.nfo"], "hong.nfo");
  check("XML hong -> ok=false", hong.ok === false);
  check("co thong bao loi ro rang", !!hong.error && hong.error.length > 5, hong.error);
  check("giu lai ten file de con bao cho nguoi dung",
        hong.filename === "hong.nfo", hong.filename);

  // ------------------------------------------------------------------ 3

  section("3. Dau vao la rac thi khong duoc nem loi");

  [
    ["chuoi rong", ""],
    ["chi khoang trang", "   \n  "],
    ["khong phai XML", "day khong phai xml gi ca"],
    ["HTML", "<html><body>xin chao</body></html>"],
    ["JSON", '{"title": "khong phai nfo"}'],
    ["XML hop le nhung the goc la", xml("<config><a>1</a></config>")],
    ["chi co khai bao XML", '<?xml version="1.0"?>']
  ].forEach(function (pair) {
    var r;
    var threw = false;
    try { r = NFO.parse(pair[1], "x.nfo"); } catch (e) { threw = true; }
    check(pair[0] + " -> tra loi chu khong nem", !threw && r && r.ok === false,
          threw ? "DA NEM LOI" : (r && r.error));
  });

  var nully;
  try { nully = NFO.parse(null, "x.nfo"); } catch (e) { nully = null; }
  check("null -> tra loi chu khong nem", nully && nully.ok === false);

  // ------------------------------------------------------------------ 4

  section("4. Chi doc the CON TRUC TIEP, khong lay nham the long nhau");

  var long = NFO.parse(xml(
    "<movie>" +
      "<title>Tieu de that</title>" +
      "<actor><name>Dien vien</name><role>Vai</role></actor>" +
      "<fileinfo><streamdetails>" +
        "<video><codec>h264</codec><width>1920</width></video>" +
        "<audio><codec>aac</codec><channels>6</channels></audio>" +
      "</streamdetails></fileinfo>" +
    "</movie>"), "long.nfo");
  check("doc duoc", long.ok, long.error);
  if (long.ok) {
    check("title khong bi <name> cua actor lam nhieu",
          long.data.title === "Tieu de that", long.data.title);
    check("codec hinh dung", long.data.video.codec === "h264");
    check("codec tieng dung (khong lay nham cua video)",
          long.data.audio.codec === "aac", long.data.audio.codec);
    check("so kenh", long.data.audio.channels === 6);
    check("dien vien", long.data.people.length === 1 &&
          long.data.people[0].name === "Dien vien");
  }

  // ------------------------------------------------------------------ 5

  section("5. Ngay thang khong nhat quan giua cac cong cu");

  function ngay(body) { var r = NFO.parse(xml("<movie>" + body + "</movie>"), "d.nfo");
                        return r.ok ? r.data.date : "LOI"; }
  check("<premiered> ISO", ngay("<premiered>2026-03-14</premiered>") === "2026-03-14");
  check("<aired> khi khong co premiered",
        ngay("<aired>2020-01-02</aired>") === "2020-01-02");
  check("<dateadded> co ca gio -> cat lay ngay",
        ngay("<dateadded>2019-05-06 12:30:00</dateadded>") === "2019-05-06",
        ngay("<dateadded>2019-05-06 12:30:00</dateadded>"));
  check("chi co <year> -> tra ve nam",
        ngay("<year>1999</year>") === "1999");
  check("premiered uu tien hon year",
        ngay("<year>1999</year><premiered>2001-02-03</premiered>") === "2001-02-03");
  check("khong co gi -> null", ngay("<title>x</title>") === null);
  check("ngay rac -> khong no", ["LOI", null].indexOf(ngay("<premiered>hom qua</premiered>")) >= 0
        || typeof ngay("<premiered>hom qua</premiered>") === "string");

  // ------------------------------------------------------------------ 6

  section("6. Dinh dang so lieu cho nguoi doc");

  check("23 giay -> 0:23", NFO.fmtDuration(23) === "0:23", NFO.fmtDuration(23));
  check("635 giay -> 10:35", NFO.fmtDuration(635) === "10:35", NFO.fmtDuration(635));
  check("16199 giay -> 4:29:59", NFO.fmtDuration(16199) === "4:29:59", NFO.fmtDuration(16199));
  check("0 giay -> 0:00", NFO.fmtDuration(0) === "0:00", NFO.fmtDuration(0));
  check("null -> null", NFO.fmtDuration(null) === null);

  check("128000 bit/s -> 128 kbps", NFO.fmtBitrate(128000) === "128 kbps");
  check("129481 bit/s -> 129 kbps", NFO.fmtBitrate(129481) === "129 kbps");
  check("0 -> null", NFO.fmtBitrate(0) === null);

  check("44100 Hz -> 44.1 kHz", NFO.fmtRate(44100) === "44.1 kHz", NFO.fmtRate(44100));
  check("48000 Hz -> 48 kHz (bo .0)", NFO.fmtRate(48000) === "48 kHz", NFO.fmtRate(48000));

  check("1 kenh -> mono", NFO.fmtChannels(1) === "mono");
  check("2 kenh -> stereo", NFO.fmtChannels(2) === "stereo");
  check("6 kenh -> 6 kênh", NFO.fmtChannels(6) === "6 kênh", NFO.fmtChannels(6));

  check("dong tom tat hinh",
        NFO.videoLine({ codec: "h264", width: 1080, height: 1920, framerate: 30 })
        === "h264 · 1080×1920 · 30 fps",
        NFO.videoLine({ codec: "h264", width: 1080, height: 1920, framerate: 30 }));
  check("dong tom tat tieng",
        NFO.audioLine({ codec: "aac", bitrate: 128000, samplingrate: 44100, channels: 2 })
        === "aac · 128 kbps · 44.1 kHz · stereo",
        NFO.audioLine({ codec: "aac", bitrate: 128000, samplingrate: 44100, channels: 2 }));
  check("thieu so lieu thi bo qua phan do",
        NFO.audioLine({ codec: "opus" }) === "opus", NFO.audioLine({ codec: "opus" }));
  check("khong co gi -> null", NFO.videoLine(null) === null);

  // ------------------------------------------------------------------ 7

  section("7. Ky tu dac biet trong XML");

  var nasty = NFO.parse(xml(
    "<movie><title>A &amp; B &lt;script&gt; &quot;trich&quot;</title>" +
    "<plot><![CDATA[Trong CDATA co < va & khong can thoat]]></plot></movie>"),
    "nasty.nfo");
  check("doc duoc file co ky tu dac biet", nasty.ok, nasty.error);
  if (nasty.ok) {
    check("thuc the XML duoc giai ma dung",
          nasty.data.title === 'A & B <script> "trich"', nasty.data.title);
    check("CDATA doc duoc",
          (nasty.data.plot || "").indexOf("< va &") > 0, nasty.data.plot);
  }

  var emoji = NFO.parse(xml("<movie><title>Vui 😀 qua</title></movie>"), "e.nfo");
  check("emoji giu nguyen", emoji.ok && emoji.data.title.indexOf("😀") > 0);

  var trong = NFO.parse(xml("<movie><title>  </title><plot></plot></movie>"), "t.nfo");
  check("the rong -> null chu khong phai chuoi rong",
        trong.ok && trong.data.title === null && trong.data.plot === null);

  // ------------------------------------------------------------------ tong

  var sum = document.getElementById("summary");
  sum.textContent = "KET QUA: " + pass + " pass, " + fail + " fail";
  sum.className = fail === 0 ? "pass" : "fail";
  document.title = (fail === 0 ? "PASS " : "FAIL ") + pass + "/" + (pass + fail);
})();
