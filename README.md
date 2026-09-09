# nfo-viewer

Đọc file sidecar `.nfo` — loại tệp siêu dữ liệu mà **Kodi**, **Jellyfin** và
**Emby** đặt cạnh video — ngay trong trình duyệt.

Thả file vào, thấy ngay tiêu đề, tác giả, ngày đăng, hashtag, thông số hình và
tiếng. Quan trọng hơn: **thấy file nào đang thiếu gì**, để biết cần bổ sung ở
đâu thay vì mở từng file XML ra đọc.

![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)

---

## Dùng thế nào

Mở `index.html`. Không cần cài gì, không cần máy chủ, không cần mạng.

```bash
git clone https://github.com/nguyenquocanhz/nfo-viewer.git
cd nfo-viewer
# rồi mở index.html bằng trình duyệt
```

App mở lên đã có sẵn 5 file mẫu trong `samples/` để bạn thấy ngay nó làm gì —
trong đó cố ý có **một file hỏng XML** và **một file thiếu dữ liệu**, vì đó là
hai thứ bạn sẽ gặp thật.

**Nội dung file không đi đâu cả.** Việc đọc diễn ra hoàn toàn trong trình duyệt
bằng `FileReader` + `DOMParser`; không có yêu cầu mạng nào mang dữ liệu ra
ngoài. Mở tab Network của trình duyệt mà kiểm tra.

## Làm được gì

| | |
|---|---|
| **Thả nhiều file** | Kéo cả nắm `.nfo` vào, hoặc bấm *Chọn file…* |
| **Xếp hạng** | Bấm tiêu đề cột để sắp theo tên, nền tảng, ngày, độ dài, mức thiếu |
| **Tìm** | Lọc theo tiêu đề, thẻ, tác giả, mô tả, tên file |
| **Báo thiếu** | Mỗi file hiện *Đầy đủ* / *Thiếu N mục* / *Không đọc được*, kèm danh sách cụ thể |
| **Xuất** | JSON (đủ trường) hoặc CSV (mở được bằng Excel, có BOM nên không lỗi tiếng Việt) |
| **Xem XML gốc** | Mở phần *Xem XML gốc* ở cuối khung chi tiết |
| **Sáng / tối** | Theo hệ điều hành, và có nút đổi tay |

## Đọc được những gì

Nhận các thẻ gốc của Kodi: `<movie>`, `<musicvideo>`, `<episodedetails>`,
`<tvshow>`, `<album>`, `<artist>`.

Vài chỗ trong định dạng `.nfo` không nhất quán giữa các công cụ sinh ra nó, và
app xử lý sẵn:

- **Thời lượng.** `<runtime>` của Kodi tính bằng **phút**, còn
  `<durationinseconds>` trong `<streamdetails>` tính bằng **giây**. App ưu tiên
  giá trị theo giây vì nó chính xác hơn, chỉ lùi về `<runtime>` khi không có.
- **Ngày tháng.** Đọc lần lượt `<premiered>` → `<aired>` → `<releasedate>` →
  `<dateadded>` → `<year>`. `<dateadded>` có kèm giờ nên bị cắt lấy phần ngày.
- **Bitrate.** Trong `.nfo` ghi bằng **bit/giây**; app hiển thị kbps.
- **Thẻ lồng nhau.** Chỉ đọc thẻ con trực tiếp, nên `<name>` bên trong
  `<actor>` không bị nhầm thành tiêu đề, và `<codec>` của `<audio>` không lấy
  nhầm của `<video>`.
- **Thẻ riêng.** Các thẻ `<stat_*>` (lượt xem, lượt thích) là phần mở rộng —
  Kodi bỏ qua chúng, app gom lại và hiện ra.

File hỏng không làm hỏng cả mẻ: nó hiện thành một dòng *Không đọc được* kèm lý
do cụ thể từ trình phân tích XML, các file còn lại vẫn đọc bình thường.

## Kiểm thử

Mở `tests/test.html` trong trình duyệt. Không cần cài gì.

77 trường hợp: đọc file mẫu, file thiếu dữ liệu, XML hỏng, đầu vào rác (chuỗi
rỗng, HTML, JSON, `null`), thẻ lồng nhau, năm cách ghi ngày, định dạng số liệu,
và ký tự đặc biệt (thực thể XML, CDATA, emoji, chữ Trung, tiếng Việt có dấu).

Test chạy **trong trình duyệt** chứ không phải Node, vì phần đọc dùng
`DOMParser` — thứ Node không có sẵn. Chạy test ở đúng nơi mã chạy thật thì kết
quả mới nói lên điều gì.

## Cấu trúc

```
index.html              giao diện
assets/
├── nfo.js              đọc và chuẩn hoá — thuần tuý, không đụng DOM của trang
├── app.js              bảng, khung chi tiết, kéo-thả, xuất file
├── samples.js          file mẫu nhúng sẵn (SINH TỰ ĐỘNG)
└── style.css
samples/                5 file .nfo mẫu, thả vào app được
tests/                  test.html + test.js
tools/embed-samples.py  sinh lại assets/samples.js từ samples/
```

`assets/samples.js` được nhúng sẵn vì trình duyệt chặn `fetch()` tới file nằm
cạnh khi mở bằng `file://`. Sửa file mẫu thì chạy lại:

```bash
python tools/embed-samples.py
```

## Sinh file .nfo từ đâu

App này chỉ *đọc*. Nếu cần *tạo* `.nfo` cho video tải từ mạng xã hội, xem
[SocialDownloaderAPI](https://github.com/nguyenquocanhz/SocialDownloaderAPI) —
endpoint `GET /v1/download/nfo` sinh ra đúng định dạng này. Các file trong
`samples/` là đầu ra thật của nó.

## Giấy phép

GPL-3.0-or-later. Toàn văn ở [LICENSE](LICENSE).
