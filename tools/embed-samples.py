#!/usr/bin/env python3
"""Nhung cac file trong samples/ vao assets/samples.js.

Vi sao can: app mo bang file:// khong fetch() duoc file nam canh no (trinh
duyet chan vi ly do nguon goc), nen muon app vua mo da co du lieu that de xem
thi phai nhung san. Chay lai script nay moi khi doi file mau.

    python tools/embed-samples.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "samples.js"

HEADER = (
    "/*! nfo-viewer - file mau nhung san. SINH TU DONG, dung sua tay.\n"
    " *  Chay: python tools/embed-samples.py\n"
    " */\n"
)


def main() -> int:
    files = sorted((ROOT / "samples").glob("*.nfo"))
    if not files:
        print("Khong thay file .nfo nao trong samples/")
        return 1

    data = {p.name: p.read_text(encoding="utf-8") for p in files}
    body = HEADER + "var SAMPLES = " + json.dumps(
        data, ensure_ascii=False, indent=2
    ) + ";\n"
    OUT.write_text(body, encoding="utf-8")

    print(f"Da ghi {OUT.relative_to(ROOT)} tu {len(files)} file mau:")
    for p in files:
        print(f"  {p.name}  ({len(data[p.name])} ky tu)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
