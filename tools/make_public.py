"""Builds public/index.html from the prototype page, set to read from /api.
Usage: python tools/make_public.py ../site/index.html
"""
import sys, pathlib
src = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
tag = '<script>window.LS_API = "/api";</script>'
i = src.index('<script')          # first script tag
out = src[:i] + tag + '\n' + src[i:]
dst = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'index.html'
dst.write_text(out, encoding='utf-8')
print('wrote', dst, len(out), 'bytes')
