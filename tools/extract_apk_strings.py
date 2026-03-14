import argparse
import re


def extract_strings(data: bytes, minlen: int = 4):
    pat = re.compile(rb"[\x20-\x7E]{%d,}" % minlen)
    for m in pat.finditer(data):
        yield m.group(0).decode("ascii", "ignore")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("apk_path")
    ap.add_argument("--out", required=True)
    ap.add_argument("--minlen", type=int, default=4)
    args = ap.parse_args()

    with open(args.apk_path, "rb") as f:
        data = f.read()

    strings = list(extract_strings(data, args.minlen))
    with open(args.out, "w", encoding="utf-8", errors="ignore") as w:
        for s in strings:
            w.write(s)
            w.write("\n")

    print(f"wrote {len(strings)} strings to {args.out}")


if __name__ == "__main__":
    main()

