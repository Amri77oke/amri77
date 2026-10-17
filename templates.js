export const TEMPLATES = {
'Judul pegas': `import {AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate} from 'remotion';

export const config = {width: 1280, height: 720, fps: 30, durationInFrames: 120};

export default function Judul() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 12}});
  const keluar = interpolate(frame, [90, 120], [1, 0], {extrapolateLeft: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#2f45d1', alignItems: 'center', justifyContent: 'center'}}>
      <h1 style={{color: 'white', fontSize: 120, fontFamily: 'sans-serif',
        transform: 'scale(' + s + ')', opacity: keluar}}>Halo Remotion</h1>
    </AbsoluteFill>
  );
}
`,
'Grafik batang': `import {AbsoluteFill, useCurrentFrame, interpolate, Easing} from 'remotion';

export const config = {width: 1280, height: 720, fps: 30, durationInFrames: 150};
const data = [40, 75, 55, 90, 65];

export default function Grafik() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#f4f1ff', flexDirection: 'row', alignItems: 'flex-end',
      justifyContent: 'center', gap: 32, padding: 80}}>
      {data.map((v, i) => {
        const h = interpolate(frame, [i * 8, i * 8 + 40], [0, v * 5],
          {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
        return <div key={i} style={{width: 120, height: h, background: 'hsl(' + (230 + i * 20) + ' 70% 50%)', borderRadius: 8}} />;
      })}
    </AbsoluteFill>
  );
}
`,
'Transisi & bentuk': `import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {slide} from '@remotion/transitions/slide';
import {fade} from '@remotion/transitions/fade';
import {Star, Circle} from '@remotion/shapes';

export const config = {width: 1280, height: 720, fps: 30, durationInFrames: 150};

const Scene = ({bg, children}) => (
  <AbsoluteFill style={{background: bg, alignItems: 'center', justifyContent: 'center'}}>{children}</AbsoluteFill>
);
const Bintang = () => { const f = useCurrentFrame();
  return <div style={{transform: 'rotate(' + f * 3 + 'deg)'}}><Star points={5} innerRadius={80} outerRadius={180} fill="#ffd23f" /></div>; };

export default function Demo() {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={70}><Scene bg="#182033"><Bintang /></Scene></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide()} timing={linearTiming({durationInFrames: 20})} />
      <TransitionSeries.Sequence durationInFrames={70}><Scene bg="#2f45d1"><Circle radius={140} fill="white" /></Scene></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 20})} />
      <TransitionSeries.Sequence durationInFrames={40}><Scene bg="#e8ebf0"><Bintang /></Scene></TransitionSeries.Sequence>
    </TransitionSeries>
  );
}
`,
'Partikel noise': `import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';

export const config = {width: 1280, height: 720, fps: 30, durationInFrames: 180};

export default function Partikel() {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const dots = Array.from({length: 80}, (_, i) => {
    const x = (noise2D('pos-x', i * 1.7, frame / 120) * 0.5 + 0.5) * width;
    const y = (noise2D('pos-y', i * 1.7, frame / 120) * 0.5 + 0.5) * height;
    const r = 3 + 9 * (noise2D('ukuran', i, frame / 90) * 0.5 + 0.5);
    return <circle key={i} cx={x} cy={y} r={r} fill={'hsl(' + (190 + (i % 60)) + ' 70% 60%)'} opacity={0.55} />;
  });
  return <AbsoluteFill style={{background: '#0b1020'}}><svg width={width} height={height}>{dots}</svg></AbsoluteFill>;
}
`,
'Teks gradasi': `import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';

export const config = {width: 1280, height: 720, fps: 30, durationInFrames: 150};

export default function Gradasi() {
  const frame = useCurrentFrame();
  const shift = interpolate(frame, [0, 150], [0, 100]);
  const opacity = interpolate(frame, [0, 20, 130, 150], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#14171f', alignItems: 'center', justifyContent: 'center'}}>
      <h1 style={{
        fontSize: 110, fontFamily: 'sans-serif', fontWeight: 900, margin: 0, opacity,
        background: 'linear-gradient(90deg, #f5d300, #ff5f6d, #8a2be2, #f5d300)',
        backgroundSize: '300% 100%', backgroundPosition: shift + '% 0',
        WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
      }}>Animasi Gradasi</h1>
    </AbsoluteFill>
  );
}
`,
'Hitung mundur': `import {AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate} from 'remotion';

export const config = {width: 1080, height: 1080, fps: 30, durationInFrames: 150};

export default function Mundur() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const index = Math.min(4, Math.floor(frame / 30));
  const number = 5 - index;
  const local = frame % 30;
  const s = spring({frame: local, fps, config: {damping: 10}});
  const opacity = interpolate(local, [0, 6, 24, 30], [0.2, 1, 1, 0.2], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#101418', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{color: '#4ade80', fontSize: 260, fontFamily: 'monospace', fontWeight: 700,
        transform: 'scale(' + s + ')', opacity}}>{number}</div>
    </AbsoluteFill>
  );
}
`};
