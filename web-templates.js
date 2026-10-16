export const HTML_TEMPLATE = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #182033; color: #f3e4c4; font-family: Georgia, serif; }
  .scene { text-align: center; }
  .orb { width: 100px; height: 100px; margin: 0 auto 28px; background: #dbb881; border-radius: 24px; animation: turn 3s ease-in-out infinite; }
  h1 { font-size: clamp(24px, 5vw, 60px); margin: 0; }
  p { opacity: .65; }
  @keyframes turn { 0%,100% { transform: rotate(-20deg) scale(.8); } 50% { transform: rotate(160deg) scale(1.1); border-radius: 50%; } }
</style>
</head>
<body>
<div class="scene"><div class="orb"></div><h1>Gerak tanpa batas.</h1><p id="caption">HTML · CSS · JavaScript</p></div>
<script>
  document.querySelector('h1').animate(
    [{opacity: 0, transform: 'translateY(20px)'}, {opacity: 1, transform: 'translateY(0)'}],
    {duration: 1200, fill: 'both'}
  );
</script>
</body>
</html>`;

export const CSS_TEMPLATE = `.box {
  padding: 40px 60px;
  background: #dbb881;
  color: #182033;
  font: bold 32px Georgia, serif;
  border-radius: 12px;
  animation: float 2.5s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(20px) rotate(-6deg); }
  50% { transform: translateY(-20px) rotate(6deg); }
}`;
