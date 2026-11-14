#!/bin/sh
# src/ 조각을 합쳐 하나짜리 index.html 을 만든다. (GitHub Pages·파일 열기로 바로 실행)
set -e
cd "$(dirname "$0")"
{
  echo '<!doctype html>'
  echo '<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head>'
  echo '<body style="margin:0">'
  cat src/shell.html
  echo '<script>'
  echo '(()=>{'
  echo "'use strict';"
  cat src/engine.js src/ui.js src/comp.js src/report.js src/start.js
  echo '})();'
  echo '</script>'
  echo '</body></html>'
} > index.html
node -e "const s=require('fs').readFileSync('index.html','utf8');const m=s.split('<script>');new Function(m[m.length-1].split('</script>')[0]);console.log('index.html OK ('+s.length+' bytes)')"
