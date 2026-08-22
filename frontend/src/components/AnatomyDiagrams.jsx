// SVG anatomy reference diagrams for each muscle group in the Synergy cycle.
// Renders simplified schematic outlines with labeled muscle regions.
// Every muscle in the taxonomy (muscleTaxonomy.js) has a corresponding highlightable
// shape so the soreness picker can visually identify each individual muscle.
//
// Usage: <AnatomyDiagram group="Quadriceps" highlightMuscle="Rectus Femoris" />

const OUTLINE = '#3d5666';
const FILL_DEFAULT = 'rgba(34, 211, 238, 0.15)';
const FILL_HIGHLIGHT = 'rgba(34, 211, 238, 0.5)';
const FILL_DEEP = 'rgba(34, 211, 238, 0.08)';
const FILL_DEEP_HIGHLIGHT = 'rgba(34, 211, 238, 0.35)';
const LABEL_COLOR = '#96aac0';
const STROKE_WIDTH = 1.5;

const labelStyle = {
  fill: LABEL_COLOR,
  fontSize: '9px',
  fontFamily: 'system-ui, sans-serif',
  fontWeight: 400,
};

const smallLabelStyle = {
  ...labelStyle,
  fontSize: '7.5px',
};

const titleStyle = {
  fill: '#d4e4f0',
  fontSize: '11px',
  fontFamily: 'system-ui, sans-serif',
  fontWeight: 600,
  textAnchor: 'middle',
};

// Match taxonomy names to SVG shape names. Strips parentheses and does
// case-insensitive containment so "Pectoralis Major (Clavicular)" matches
// a shape named "Pectoralis Major Clavicular".
function muscleMatches(diagramName, highlightMuscle) {
  if (!highlightMuscle) return false;
  const d = diagramName.toLowerCase().replace(/[()]/g, '');
  const h = highlightMuscle.toLowerCase().replace(/[()]/g, '');
  return d === h || d.includes(h) || h.includes(d);
}

function isHighlighted(name, hl) {
  return hl ? muscleMatches(name, hl) : false;
}

// Standard muscle fill props — for surface-level muscles
function mp(name, hl) {
  const lit = isHighlighted(name, hl);
  return {
    fill: lit ? FILL_HIGHLIGHT : FILL_DEFAULT,
    stroke: lit ? '#22d3ee' : OUTLINE,
    strokeWidth: lit ? 2.2 : STROKE_WIDTH,
    strokeLinejoin: 'round',
  };
}

// Deep muscle fill props — for muscles beneath other muscles (shown more subtly)
function mpDeep(name, hl) {
  const lit = isHighlighted(name, hl);
  return {
    fill: lit ? FILL_DEEP_HIGHLIGHT : FILL_DEEP,
    stroke: lit ? '#22d3ee' : OUTLINE,
    strokeWidth: lit ? 2.0 : 0.8,
    strokeLinejoin: 'round',
    strokeDasharray: lit ? 'none' : '3,2',
  };
}

// ── Quadriceps (front thigh view) ──
function QuadsDiagram({ hl }) {
  return (
    <g>
      {/* Outer thigh outline */}
      <path
        d="M60,40 L50,60 L45,100 L42,140 L40,180 L42,220 L50,250 L55,260 L145,260 L150,250 L158,220 L160,180 L158,140 L155,100 L150,60 L140,40 Z"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={1}
        opacity={0.4}
      />

      {/* Vastus Intermedius — deep, under rectus femoris */}
      <path
        d="M82,70 Q78,100 77,140 Q77,180 80,220 L84,240 L116,240 L120,220 Q123,180 123,140 Q122,100 118,70 Z"
        {...mpDeep('Vastus Intermedius', hl)}
      />
      <text x="100" y="210" textAnchor="middle" style={smallLabelStyle}>V. Intermedius</text>
      <text x="100" y="220" textAnchor="middle" style={smallLabelStyle}>(deep)</text>

      {/* Rectus Femoris — center */}
      <path
        d="M85,55 Q80,70 78,100 Q76,140 77,180 Q78,210 82,240 L88,250 L112,250 L118,240 Q122,210 123,180 Q124,140 122,100 Q120,70 115,55 Z"
        {...mp('Rectus Femoris', hl)}
      />
      <text x="100" y="155" textAnchor="middle" style={smallLabelStyle}>Rectus</text>
      <text x="100" y="165" textAnchor="middle" style={smallLabelStyle}>Femoris</text>

      {/* Vastus Lateralis — outer */}
      <path
        d="M60,50 Q55,70 50,100 Q46,140 45,180 Q46,210 50,240 L58,255 L82,250 Q78,210 77,180 Q76,140 78,100 Q80,70 85,55 Z"
        {...mp('Vastus Lateralis', hl)}
      />
      <text x="55" y="130" textAnchor="middle" style={smallLabelStyle}>Vastus</text>
      <text x="55" y="140" textAnchor="middle" style={smallLabelStyle}>Lateralis</text>

      {/* Vastus Medialis — inner */}
      <path
        d="M140,50 Q145,70 150,100 Q154,140 155,180 Q154,210 150,240 L142,255 L118,250 Q122,210 123,180 Q124,140 122,100 Q120,70 115,55 Z"
        {...mp('Vastus Medialis', hl)}
      />
      <text x="145" y="130" textAnchor="middle" style={smallLabelStyle}>Vastus</text>
      <text x="145" y="140" textAnchor="middle" style={smallLabelStyle}>Medialis</text>

      {/* Kneecap reference */}
      <ellipse cx="100" cy="264" rx="14" ry="8" fill="none" stroke={OUTLINE} strokeWidth={0.8} opacity={0.5} />
      <text x="100" y="282" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.5 }}>patella</text>
    </g>
  );
}

// ── Hamstrings (back thigh view) ──
function HamstringsDiagram({ hl }) {
  return (
    <g>
      {/* Outer thigh outline — posterior */}
      <path
        d="M60,30 L50,50 L45,90 L42,140 L40,190 L42,230 L55,260 L145,260 L158,230 L160,190 L158,140 L155,90 L150,50 L140,30 Z"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={1}
        opacity={0.4}
      />

      {/* Biceps Femoris (Long Head) — lateral upper */}
      <path
        d="M60,40 Q55,60 52,90 Q48,130 47,160 L52,165 Q65,155 80,150 Q87,148 90,145 Q92,120 93,100 Q92,80 95,55 Z"
        {...mp('Biceps Femoris (Long Head)', hl)}
      />
      <text x="65" y="105" textAnchor="middle" style={smallLabelStyle}>BF Long</text>
      <text x="65" y="115" textAnchor="middle" style={smallLabelStyle}>Head</text>

      {/* Biceps Femoris (Short Head) — lateral lower */}
      <path
        d="M47,160 Q48,195 50,220 L62,255 L88,255 Q86,230 85,200 Q84,175 83,155 Q75,158 65,162 L52,165 Z"
        {...mp('Biceps Femoris (Short Head)', hl)}
      />
      <text x="62" y="210" textAnchor="middle" style={smallLabelStyle}>BF Short</text>
      <text x="62" y="220" textAnchor="middle" style={smallLabelStyle}>Head</text>

      {/* Semitendinosus — medial */}
      <path
        d="M140,40 Q145,60 148,90 Q152,130 153,170 Q152,200 148,230 L138,255 L112,255 Q114,220 114,190 Q113,150 110,110 Q108,80 105,55 Z"
        {...mp('Semitendinosus', hl)}
      />
      <text x="135" y="145" textAnchor="middle" style={smallLabelStyle}>Semi-</text>
      <text x="135" y="155" textAnchor="middle" style={smallLabelStyle}>tendinosus</text>

      {/* Semimembranosus — deep medial */}
      <path
        d="M105,55 Q103,80 100,110 Q97,150 96,190 Q96,220 98,248 L103,255 L112,255 Q114,220 114,190 Q113,150 110,110 Q108,80 105,55 Z"
        {...mp('Semimembranosus', hl)}
      />
      <text x="100" y="210" textAnchor="middle" style={smallLabelStyle}>Semi-</text>
      <text x="100" y="220" textAnchor="middle" style={smallLabelStyle}>membranosus</text>

      {/* Central dividing line hint */}
      <path
        d="M95,55 Q93,80 90,110 Q87,148 85,180"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={0.5}
        strokeDasharray="3,3"
        opacity={0.4}
      />

      {/* Glute reference at top */}
      <path
        d="M60,30 Q80,20 100,18 Q120,20 140,30"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={0.8}
        strokeDasharray="3,2"
        opacity={0.4}
      />
      <text x="100" y="14" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.4 }}>glute</text>
    </g>
  );
}

// ── Glutes (posterior hip view) ──
function GlutesDiagram({ hl }) {
  return (
    <g>
      {/* Pelvis outline */}
      <path
        d="M30,80 Q40,40 70,30 Q100,25 130,30 Q160,40 170,80 L170,100 Q160,120 140,130 L60,130 Q40,120 30,100 Z"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={1}
        opacity={0.4}
      />

      {/* Gluteus Minimus — deepest, shown first */}
      <path
        d="M60,65 Q70,50 100,47 Q130,50 140,65 Q135,58 100,53 Q65,58 60,65 Z"
        {...mpDeep('Gluteus Minimus', hl)}
      />
      {/* Extend minimus shape to be more visible */}
      <path
        d="M58,68 Q68,48 100,44 Q132,48 142,68 Q130,55 100,50 Q70,55 58,68 Z"
        {...mpDeep('Gluteus Minimus', hl)}
      />
      <text x="100" y="60" textAnchor="middle" style={smallLabelStyle}>Glut. Minimus</text>

      {/* Gluteus Medius — upper fan */}
      <path
        d="M45,70 Q50,45 80,35 Q100,32 120,35 Q150,45 155,70 Q140,60 100,55 Q60,60 45,70 Z"
        {...mp('Gluteus Medius', hl)}
      />
      <text x="100" y="45" textAnchor="middle" style={smallLabelStyle}>Gluteus Medius</text>

      {/* Gluteus Maximus */}
      <path
        d="M40,85 Q45,55 75,42 Q100,38 125,42 Q155,55 160,85 Q160,110 148,125 Q130,140 100,145 Q70,140 52,125 Q40,110 40,85 Z"
        {...mp('Gluteus Maximus', hl)}
      />
      <text x="100" y="105" textAnchor="middle" style={labelStyle}>Gluteus Maximus</text>

      {/* Upper thigh references */}
      <path d="M55,145 L50,200 Q48,230 55,260" fill="none" stroke={OUTLINE} strokeWidth={0.6} opacity={0.3} />
      <path d="M145,145 L150,200 Q152,230 145,260" fill="none" stroke={OUTLINE} strokeWidth={0.6} opacity={0.3} />

      {/* Spine reference */}
      <line x1="100" y1="20" x2="100" y2="32" stroke={OUTLINE} strokeWidth={0.8} opacity={0.3} />
      <text x="100" y="16" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.3 }}>spine</text>
    </g>
  );
}

// ── Calves (posterior lower leg) ──
function CalvesDiagram({ hl }) {
  return (
    <g>
      {/* Lower leg outline */}
      <path
        d="M55,30 L50,50 Q42,80 42,120 Q42,160 48,190 Q52,220 58,250 L62,270 Q65,278 80,280 L120,280 Q135,278 138,270 L142,250 Q148,220 152,190 Q158,160 158,120 Q158,80 150,50 L145,30 Z"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={1}
        opacity={0.4}
      />

      {/* Tibialis Anterior — front of shin (lateral in this posterior view) */}
      <path
        d="M135,40 Q140,55 143,80 Q146,110 146,140 Q145,170 142,195 L138,210 L130,208 Q133,180 134,150 Q135,120 134,90 Q132,60 128,42 Z"
        {...mp('Tibialis Anterior', hl)}
      />
      <text x="148" y="130" textAnchor="start" style={smallLabelStyle}>Tib.</text>
      <text x="148" y="140" textAnchor="start" style={smallLabelStyle}>Ant.</text>

      {/* Gastrocnemius — medial head */}
      <path
        d="M68,35 Q62,55 58,80 Q55,110 56,140 Q58,165 64,185 L84,185 Q82,160 80,135 Q78,110 80,80 Q82,55 85,35 Z"
        {...mp('Gastrocnemius (Medial)', hl)}
      />
      <text x="62" y="110" textAnchor="middle" style={smallLabelStyle}>Gastroc.</text>
      <text x="62" y="120" textAnchor="middle" style={smallLabelStyle}>(medial)</text>

      {/* Gastrocnemius — lateral head */}
      <path
        d="M95,35 Q98,55 100,80 Q102,110 100,135 Q98,160 96,185 L116,185 Q122,165 125,140 Q128,110 125,80 Q122,55 115,35 Z"
        {...mp('Gastrocnemius (Lateral)', hl)}
      />
      <text x="122" y="110" textAnchor="middle" style={smallLabelStyle}>Gastroc.</text>
      <text x="122" y="120" textAnchor="middle" style={smallLabelStyle}>(lateral)</text>

      {/* Soleus — deeper, visible below gastroc */}
      <path
        d="M62,160 Q60,185 62,210 Q65,235 70,250 L130,250 Q135,235 138,210 Q140,185 138,160 L120,170 Q105,175 90,175 Q75,170 62,160 Z"
        {...mp('Soleus', hl)}
      />
      <text x="100" y="220" textAnchor="middle" style={labelStyle}>Soleus</text>

      {/* Central division line between gastroc heads */}
      <path
        d="M92,38 Q90,80 90,120 Q90,150 92,180"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={0.8}
        opacity={0.5}
      />

      {/* Achilles tendon */}
      <path
        d="M85,250 Q90,260 92,270 L92,286 L108,286 L108,270 Q110,260 115,250 Q108,255 100,256 Q92,255 85,250 Z"
        {...mp('Achilles Tendon', hl)}
      />
      <text x="100" y="296" textAnchor="middle" style={smallLabelStyle}>Achilles</text>

      {/* Knee reference */}
      <text x="92" y="26" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.3 }}>knee</text>
    </g>
  );
}

// ── Pecs (anterior chest) ──
function PecsDiagram({ hl }) {
  return (
    <g>
      {/* Ribcage outline */}
      <path
        d="M40,60 Q45,40 70,30 L100,25 L130,30 Q155,40 160,60 L165,100 Q165,140 155,170 L100,185 L45,170 Q35,140 35,100 Z"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={1}
        opacity={0.4}
      />

      {/* Pectoralis Minor — deep, behind major (draw first so major overlaps) */}
      <path
        d="M60,58 Q70,48 85,44 L97,50 L97,82 Q88,90 75,95 Q65,88 60,75 Z"
        {...mpDeep('Pectoralis Minor', hl)}
      />
      <path
        d="M140,58 Q130,48 115,44 L103,50 L103,82 Q112,90 125,95 Q135,88 140,75 Z"
        {...mpDeep('Pectoralis Minor', hl)}
      />
      <text x="100" y="74" textAnchor="middle" style={smallLabelStyle}>Pec Minor</text>
      <text x="100" y="83" textAnchor="middle" style={smallLabelStyle}>(deep)</text>

      {/* Pectoralis Major (Clavicular) — upper chest, left */}
      <path
        d="M50,55 Q55,42 75,35 L97,32 L97,72 Q85,75 75,72 Q62,68 50,60 Z"
        {...mp('Pectoralis Major (Clavicular)', hl)}
      />
      {/* Pectoralis Major (Clavicular) — upper chest, right */}
      <path
        d="M150,55 Q145,42 125,35 L103,32 L103,72 Q115,75 125,72 Q138,68 150,60 Z"
        {...mp('Pectoralis Major (Clavicular)', hl)}
      />
      <text x="100" y="55" textAnchor="middle" style={smallLabelStyle}>Clavicular</text>
      <text x="100" y="64" textAnchor="middle" style={smallLabelStyle}>(upper)</text>

      {/* Pectoralis Major (Sternal) — lower chest, left */}
      <path
        d="M50,60 Q62,68 75,72 Q85,75 97,72 L97,100 Q95,115 90,128 Q82,140 68,148 Q55,140 48,120 Q42,100 42,80 L50,60 Z"
        {...mp('Pectoralis Major (Sternal)', hl)}
      />
      {/* Pectoralis Major (Sternal) — lower chest, right */}
      <path
        d="M150,60 Q138,68 125,72 Q115,75 103,72 L103,100 Q105,115 110,128 Q118,140 132,148 Q145,140 152,120 Q158,100 158,80 L150,60 Z"
        {...mp('Pectoralis Major (Sternal)', hl)}
      />
      <text x="100" y="112" textAnchor="middle" style={smallLabelStyle}>Sternal</text>
      <text x="100" y="121" textAnchor="middle" style={smallLabelStyle}>(lower)</text>

      {/* Division line between clavicular and sternal */}
      <path
        d="M50,60 Q75,75 97,72"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={0.6}
        opacity={0.5}
      />
      <path
        d="M150,60 Q125,75 103,72"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={0.6}
        opacity={0.5}
      />

      {/* Serratus Anterior — finger-like projections along side ribs */}
      <path
        d="M38,92 L48,88 L48,96 L38,100 Z"
        {...mp('Serratus Anterior', hl)}
      />
      <path
        d="M36,104 L48,100 L48,108 L36,112 Z"
        {...mp('Serratus Anterior', hl)}
      />
      <path
        d="M35,116 L48,112 L48,120 L36,124 Z"
        {...mp('Serratus Anterior', hl)}
      />
      <path
        d="M36,128 L48,124 L48,132 L38,136 Z"
        {...mp('Serratus Anterior', hl)}
      />
      {/* Right side */}
      <path
        d="M162,92 L152,88 L152,96 L162,100 Z"
        {...mp('Serratus Anterior', hl)}
      />
      <path
        d="M164,104 L152,100 L152,108 L164,112 Z"
        {...mp('Serratus Anterior', hl)}
      />
      <path
        d="M165,116 L152,112 L152,120 L164,124 Z"
        {...mp('Serratus Anterior', hl)}
      />
      <path
        d="M164,128 L152,124 L152,132 L162,136 Z"
        {...mp('Serratus Anterior', hl)}
      />
      <text x="28" y="115" textAnchor="middle" style={smallLabelStyle}>Serratus</text>
      <text x="172" y="115" textAnchor="middle" style={smallLabelStyle}>Serratus</text>

      {/* Clavicle line */}
      <path
        d="M40,38 Q70,28 100,25 Q130,28 160,38"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={1}
        opacity={0.5}
      />
      <text x="100" y="20" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.4 }}>clavicle</text>

      {/* Sternum */}
      <line x1="100" y1="30" x2="100" y2="165" stroke={OUTLINE} strokeWidth={1} opacity={0.4} />
      <text x="100" y="175" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.4 }}>sternum</text>

      {/* Shoulder references */}
      <circle cx="35" cy="50" r="10" fill="none" stroke={OUTLINE} strokeWidth={0.6} opacity={0.3} />
      <circle cx="165" cy="50" r="10" fill="none" stroke={OUTLINE} strokeWidth={0.6} opacity={0.3} />
    </g>
  );
}

// ── Lats & Back (posterior torso) ──
function BackDiagram({ hl }) {
  return (
    <g>
      {/* Torso outline */}
      <path
        d="M35,30 Q50,20 75,18 L100,16 L125,18 Q150,20 165,30 L170,60 L172,100 Q170,140 162,170 L150,200 L100,210 L50,200 L38,170 Q30,140 28,100 L30,60 Z"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={1}
        opacity={0.4}
      />

      {/* Infraspinatus — on scapula surface (draw first, behind teres) */}
      <path
        d="M56,60 L78,55 L80,92 L62,100 Q52,85 54,70 Z"
        {...mpDeep('Infraspinatus', hl)}
      />
      <path
        d="M144,60 L122,55 L120,92 L138,100 Q148,85 146,70 Z"
        {...mpDeep('Infraspinatus', hl)}
      />
      <text x="66" y="82" textAnchor="middle" style={smallLabelStyle}>Infra-</text>
      <text x="134" y="82" textAnchor="middle" style={smallLabelStyle}>spinatus</text>

      {/* Latissimus Dorsi — left */}
      <path
        d="M38,65 Q35,90 34,120 Q36,155 42,180 L55,195 L95,200 L95,120 Q90,100 80,85 Q68,70 50,62 Z"
        {...mp('Latissimus Dorsi', hl)}
      />
      {/* Latissimus Dorsi — right */}
      <path
        d="M162,65 Q165,90 166,120 Q164,155 158,180 L145,195 L105,200 L105,120 Q110,100 120,85 Q132,70 150,62 Z"
        {...mp('Latissimus Dorsi', hl)}
      />
      <text x="60" y="155" textAnchor="middle" style={labelStyle}>Lat</text>
      <text x="140" y="155" textAnchor="middle" style={labelStyle}>Lat</text>

      {/* Trapezius (Upper) — neck to shoulder top */}
      <path
        d="M75,20 Q85,18 100,16 Q115,18 125,20 L140,30 Q125,38 100,40 Q75,38 60,30 Z"
        {...mp('Trapezius (Upper)', hl)}
      />
      <text x="100" y="30" textAnchor="middle" style={smallLabelStyle}>Trap Upper</text>

      {/* Trapezius (Middle) — shoulder blade level */}
      <path
        d="M60,30 Q75,38 100,40 Q125,38 140,30 L148,40 Q130,52 100,55 Q70,52 52,40 Z"
        {...mp('Trapezius (Middle)', hl)}
      />
      <text x="100" y="48" textAnchor="middle" style={smallLabelStyle}>Trap Middle</text>

      {/* Trapezius (Lower) — below shoulder blades, diamond shape */}
      <path
        d="M52,40 Q70,52 100,55 Q130,52 148,40 L138,55 Q120,65 100,68 Q80,65 62,55 Z"
        {...mp('Trapezius (Lower)', hl)}
      />
      <text x="100" y="64" textAnchor="middle" style={{ ...smallLabelStyle, fontSize: '6.5px' }}>Trap Lower</text>

      {/* Teres Minor — above teres major, near scapula edge */}
      <path
        d="M52,95 L62,92 L66,100 L56,103 Z"
        {...mp('Teres Minor', hl)}
      />
      <path
        d="M148,95 L138,92 L134,100 L144,103 Z"
        {...mp('Teres Minor', hl)}
      />
      <text x="44" y="100" textAnchor="middle" style={{ ...smallLabelStyle, fontSize: '6.5px' }}>T.Min</text>
      <text x="156" y="100" textAnchor="middle" style={{ ...smallLabelStyle, fontSize: '6.5px' }}>T.Min</text>

      {/* Teres Major — below teres minor, outer scapula edge */}
      <path
        d="M50,105 L62,100 L68,112 L55,116 Z"
        {...mp('Teres Major', hl)}
      />
      <path
        d="M150,105 L138,100 L132,112 L145,116 Z"
        {...mp('Teres Major', hl)}
      />
      <text x="42" y="114" textAnchor="middle" style={{ ...smallLabelStyle, fontSize: '6.5px' }}>T.Maj</text>
      <text x="158" y="114" textAnchor="middle" style={{ ...smallLabelStyle, fontSize: '6.5px' }}>T.Maj</text>

      {/* Rhomboids — between spine and scapula */}
      <path
        d="M82,50 L95,48 L95,95 L82,100 Q78,80 80,65 Z"
        {...mp('Rhomboids', hl)}
      />
      <path
        d="M118,50 L105,48 L105,95 L118,100 Q122,80 120,65 Z"
        {...mp('Rhomboids', hl)}
      />
      <text x="88" y="75" textAnchor="middle" style={smallLabelStyle}>Rhom.</text>
      <text x="112" y="75" textAnchor="middle" style={smallLabelStyle}>Rhom.</text>

      {/* Erector Spinae (Upper) — along upper spine */}
      <path
        d="M92,70 L95,70 L95,140 L92,140 Z"
        {...mp('Erector Spinae (Upper)', hl)}
      />
      <path
        d="M108,70 L105,70 L105,140 L108,140 Z"
        {...mp('Erector Spinae (Upper)', hl)}
      />
      <text x="100" y="108" textAnchor="middle" style={smallLabelStyle}>Erectors</text>
      <text x="100" y="117" textAnchor="middle" style={smallLabelStyle}>(upper)</text>

      {/* Erector Spinae (Lower) — along lower spine */}
      <path
        d="M90,140 L95,140 L95,195 Q94,198 90,198 Z"
        {...mp('Erector Spinae (Lower)', hl)}
      />
      <path
        d="M110,140 L105,140 L105,195 Q106,198 110,198 Z"
        {...mp('Erector Spinae (Lower)', hl)}
      />
      <text x="100" y="170" textAnchor="middle" style={smallLabelStyle}>Erectors</text>
      <text x="100" y="179" textAnchor="middle" style={smallLabelStyle}>(lower)</text>

      {/* Spine reference */}
      <line x1="100" y1="16" x2="100" y2="210" stroke={OUTLINE} strokeWidth={0.6} opacity={0.3} strokeDasharray="4,3" />

      {/* Scapula outlines */}
      <path d="M55,45 L80,42 L82,100 L60,108 Q50,90 52,60 Z" fill="none" stroke={OUTLINE} strokeWidth={0.6} opacity={0.3} />
      <path d="M145,45 L120,42 L118,100 L140,108 Q150,90 148,60 Z" fill="none" stroke={OUTLINE} strokeWidth={0.6} opacity={0.3} />
    </g>
  );
}

// ── Deltoids (shoulder view, front-facing) ──
function DeltoidsDiagram({ hl }) {
  return (
    <g>
      {/* Shoulder/upper arm outline */}
      <path
        d="M50,100 Q30,90 20,70 Q15,50 25,35 Q40,18 65,15 Q90,14 100,20 Q110,14 135,15 Q160,18 175,35 Q185,50 180,70 Q170,90 150,100 L155,140 L160,200 L150,200 L140,140 L130,110 L100,105 L70,110 L60,140 L50,200 L40,200 L45,140 Z"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={1}
        opacity={0.4}
      />

      {/* Posterior Deltoid — rear of shoulder (draw first, behind others) */}
      <path
        d="M35,38 Q32,50 34,62 Q38,74 45,82 Q50,72 54,60 Q52,45 48,34 Q42,32 35,38 Z"
        {...mp('Posterior Deltoid', hl)}
      />
      <path
        d="M165,38 Q168,50 166,62 Q162,74 155,82 Q150,72 146,60 Q148,45 152,34 Q158,32 165,38 Z"
        {...mp('Posterior Deltoid', hl)}
      />
      <text x="26" y="62" textAnchor="middle" style={smallLabelStyle}>Post.</text>
      <text x="174" y="62" textAnchor="middle" style={smallLabelStyle}>Post.</text>

      {/* Lateral Deltoid — side (left) */}
      <path
        d="M40,40 Q35,55 38,70 Q42,82 50,90 Q58,80 64,70 Q55,58 55,45 Q50,32 45,30 Q42,33 40,40 Z"
        {...mp('Lateral Deltoid', hl)}
      />
      <text x="38" y="80" textAnchor="end" style={smallLabelStyle}>Lateral</text>

      {/* Anterior Deltoid — front (left) */}
      <path
        d="M70,28 Q85,20 100,22 L100,65 Q92,75 82,80 Q72,78 64,70 Q55,58 55,45 Q58,32 70,28 Z"
        {...mp('Anterior Deltoid', hl)}
      />
      <text x="78" y="55" textAnchor="middle" style={smallLabelStyle}>Anterior</text>

      {/* Anterior Deltoid — front (right) */}
      <path
        d="M130,28 Q115,20 100,22 L100,65 Q108,75 118,80 Q128,78 136,70 Q145,58 145,45 Q142,32 130,28 Z"
        {...mp('Anterior Deltoid', hl)}
      />

      {/* Lateral Deltoid — side (right) */}
      <path
        d="M160,40 Q165,55 162,70 Q158,82 150,90 Q142,80 136,70 Q145,58 145,45 Q150,32 155,30 Q158,33 160,40 Z"
        {...mp('Lateral Deltoid', hl)}
      />
      <text x="162" y="80" textAnchor="start" style={smallLabelStyle}>Lateral</text>

      {/* Clavicle/acromion reference */}
      <path
        d="M65,22 Q80,16 100,15 Q120,16 135,22"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={0.8}
        opacity={0.4}
      />
      <text x="100" y="11" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.4 }}>acromion</text>

      {/* Upper arm reference lines */}
      <line x1="60" y1="100" x2="50" y2="180" stroke={OUTLINE} strokeWidth={0.5} opacity={0.3} />
      <line x1="140" y1="100" x2="150" y2="180" stroke={OUTLINE} strokeWidth={0.5} opacity={0.3} />
    </g>
  );
}

// ── Biceps (anterior upper arm) ──
function BicepsDiagram({ hl }) {
  return (
    <g>
      {/* Arm outline */}
      <path
        d="M65,30 Q55,35 50,50 L45,80 Q40,120 42,160 Q44,190 48,220 L55,250 Q60,258 75,260 L125,260 Q140,258 145,250 L152,220 Q156,190 158,160 Q160,120 155,80 L150,50 Q145,35 135,30 Z"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={1}
        opacity={0.4}
      />

      {/* Biceps Long Head */}
      <path
        d="M72,42 Q65,55 60,80 Q56,110 56,140 Q56,165 60,185 Q64,200 70,210 L90,212 Q88,195 86,175 Q84,150 84,120 Q84,90 88,65 Q90,50 92,42 Z"
        {...mp('Biceps Brachii (Long Head)', hl)}
      />
      <text x="70" y="130" textAnchor="middle" style={smallLabelStyle}>Long</text>
      <text x="70" y="140" textAnchor="middle" style={smallLabelStyle}>Head</text>

      {/* Biceps Short Head */}
      <path
        d="M108,42 Q110,50 112,65 Q116,90 116,120 Q116,150 114,175 Q112,195 110,212 L130,210 Q136,200 140,185 Q144,165 144,140 Q144,110 140,80 Q135,55 128,42 Z"
        {...mp('Biceps Brachii (Short Head)', hl)}
      />
      <text x="132" y="130" textAnchor="middle" style={smallLabelStyle}>Short</text>
      <text x="132" y="140" textAnchor="middle" style={smallLabelStyle}>Head</text>

      {/* Brachialis — beneath, visible on sides */}
      <path
        d="M55,180 Q52,200 52,215 Q54,230 60,242 L75,248 L125,248 L140,242 Q146,230 148,215 Q148,200 145,180 Q135,195 120,200 Q100,205 80,200 Q65,195 55,180 Z"
        {...mp('Brachialis', hl)}
      />
      <text x="100" y="235" textAnchor="middle" style={smallLabelStyle}>Brachialis</text>

      {/* Brachioradialis — top of forearm near elbow (also in Forearms diagram) */}
      <path
        d="M52,225 Q50,240 52,252 L60,260 L78,260 L82,252 Q80,242 76,230 Q68,222 58,220 Z"
        {...mp('Brachioradialis', hl)}
      />
      <text x="66" y="255" textAnchor="middle" style={{ ...smallLabelStyle, fontSize: '6.5px' }}>Brachiorad.</text>

      {/* Bicep peak area */}
      <path
        d="M84,120 Q90,105 100,100 Q110,105 116,120"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={0.6}
        opacity={0.5}
      />
      <text x="100" y="96" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.5 }}>peak</text>

      {/* Shoulder reference */}
      <ellipse cx="100" cy="30" rx="40" ry="8" fill="none" stroke={OUTLINE} strokeWidth={0.6} opacity={0.3} />
      <text x="100" y="20" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.3 }}>shoulder</text>

      {/* Elbow reference */}
      <text x="100" y="272" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.3 }}>elbow</text>
    </g>
  );
}

// ── Triceps (posterior upper arm) ──
function TricepsDiagram({ hl }) {
  return (
    <g>
      {/* Arm outline */}
      <path
        d="M65,30 Q55,35 50,50 L45,80 Q40,120 42,160 Q44,190 48,220 L55,250 Q60,258 75,260 L125,260 Q140,258 145,250 L152,220 Q156,190 158,160 Q160,120 155,80 L150,50 Q145,35 135,30 Z"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={1}
        opacity={0.4}
      />

      {/* Long Head — center/inner */}
      <path
        d="M85,40 Q80,60 78,90 Q76,130 78,170 Q80,200 84,225 L95,230 L105,230 L116,225 Q120,200 122,170 Q124,130 122,90 Q120,60 115,40 Z"
        {...mp('Triceps (Long Head)', hl)}
      />
      <text x="100" y="100" textAnchor="middle" style={smallLabelStyle}>Long</text>
      <text x="100" y="110" textAnchor="middle" style={smallLabelStyle}>Head</text>

      {/* Lateral Head — outer */}
      <path
        d="M65,45 Q58,60 54,90 Q50,120 50,150 Q52,180 56,205 L65,230 L84,225 Q80,200 78,170 Q76,130 78,90 Q80,60 85,40 Z"
        {...mp('Triceps (Lateral Head)', hl)}
      />
      <text x="58" y="145" textAnchor="middle" style={smallLabelStyle}>Lateral</text>
      <text x="58" y="155" textAnchor="middle" style={smallLabelStyle}>Head</text>

      {/* Medial Head — deep, visible near elbow */}
      <path
        d="M78,185 Q76,205 78,225 L84,240 L116,240 L122,225 Q124,205 122,185 Q115,195 100,198 Q85,195 78,185 Z"
        {...mp('Triceps (Medial Head)', hl)}
      />
      <text x="100" y="232" textAnchor="middle" style={smallLabelStyle}>Medial Head</text>

      {/* Horseshoe shape indicator */}
      <path
        d="M70,160 Q68,180 72,200 Q80,215 100,220 Q120,215 128,200 Q132,180 130,160"
        fill="none"
        stroke="#22d3ee"
        strokeWidth={0.5}
        strokeDasharray="3,2"
        opacity={0.3}
      />
      <text x="100" y="175" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.4 }}>horseshoe</text>

      {/* Shoulder reference */}
      <ellipse cx="100" cy="30" rx="40" ry="8" fill="none" stroke={OUTLINE} strokeWidth={0.6} opacity={0.3} />

      {/* Olecranon / elbow */}
      <ellipse cx="100" cy="252" rx="12" ry="6" fill="none" stroke={OUTLINE} strokeWidth={0.6} opacity={0.4} />
      <text x="100" y="272" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.3 }}>olecranon</text>
    </g>
  );
}

// ── Forearms & Grip (anterior forearm) ──
function ForearmsDiagram({ hl }) {
  return (
    <g>
      {/* Forearm outline */}
      <path
        d="M60,30 Q52,40 48,60 Q44,90 42,120 Q40,160 42,200 Q44,230 48,255 L55,270 Q60,278 70,280 L130,280 Q140,278 145,270 L152,255 Q156,230 158,200 Q160,160 158,120 Q156,90 152,60 Q148,40 140,30 Z"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={1}
        opacity={0.4}
      />

      {/* Brachioradialis — lateral */}
      <path
        d="M62,35 Q55,50 52,75 Q48,110 48,150 Q50,180 54,205 L60,215 L78,210 Q76,185 75,155 Q74,120 76,85 Q78,55 82,38 Z"
        {...mp('Brachioradialis', hl)}
      />
      <text x="55" y="125" textAnchor="middle" style={smallLabelStyle}>Brachio-</text>
      <text x="55" y="135" textAnchor="middle" style={smallLabelStyle}>radialis</text>

      {/* Pronator Teres — inner elbow to mid-forearm, diagonal */}
      <path
        d="M118,38 Q112,50 105,65 Q100,78 98,90 L106,92 Q110,80 116,65 Q122,52 128,42 Z"
        {...mp('Pronator Teres', hl)}
      />
      <text x="118" y="60" textAnchor="middle" style={smallLabelStyle}>Pronator</text>
      <text x="118" y="69" textAnchor="middle" style={smallLabelStyle}>Teres</text>

      {/* Supinator — outer forearm near elbow */}
      <path
        d="M82,42 Q78,55 76,70 Q75,82 76,92 L86,90 Q86,80 87,68 Q88,55 90,44 Z"
        {...mp('Supinator', hl)}
      />
      <text x="76" y="72" textAnchor="end" style={{ ...smallLabelStyle, fontSize: '6.5px' }}>Supinator</text>

      {/* Wrist Flexors — medial group */}
      <path
        d="M106,92 Q112,110 116,140 Q118,170 118,200 Q116,220 114,235 L132,230 Q140,215 144,190 Q148,160 148,130 Q148,105 144,80 Q140,60 134,45 L128,42 Q122,52 116,65 Q110,78 106,92 Z"
        {...mp('Wrist Flexors', hl)}
      />
      <text x="138" y="140" textAnchor="middle" style={smallLabelStyle}>Wrist</text>
      <text x="138" y="150" textAnchor="middle" style={smallLabelStyle}>Flexors</text>

      {/* Wrist Extensors — deep/posterior, shown central */}
      <path
        d="M86,90 Q88,110 90,140 Q90,170 88,200 Q86,220 86,235 L114,235 Q116,220 118,200 Q118,170 116,140 Q112,110 106,92 L98,90 Z"
        {...mp('Wrist Extensors', hl)}
      />
      <text x="100" y="165" textAnchor="middle" style={smallLabelStyle}>Extensors</text>

      {/* Finger Flexors in palm area */}
      <path
        d="M65,250 Q70,260 80,268 L120,268 Q130,260 135,250 Q125,258 100,260 Q75,258 65,250 Z"
        {...mp('Finger Flexors', hl)}
      />
      <text x="100" y="265" textAnchor="middle" style={{ ...smallLabelStyle, fontSize: '6.5px' }}>Finger Flexors</text>

      {/* Elbow reference */}
      <ellipse cx="100" cy="30" rx="35" ry="7" fill="none" stroke={OUTLINE} strokeWidth={0.6} opacity={0.3} />
      <text x="100" y="20" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.3 }}>elbow</text>

      {/* Wrist reference */}
      <line x1="60" y1="245" x2="140" y2="245" stroke={OUTLINE} strokeWidth={0.6} opacity={0.3} />
      <text x="100" y="290" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.3 }}>wrist</text>
    </g>
  );
}

// ── Abs & Core (anterior torso) ──
function AbsDiagram({ hl }) {
  return (
    <g>
      {/* Torso outline */}
      <path
        d="M40,25 Q60,18 100,15 Q140,18 160,25 L168,50 Q172,80 170,120 Q168,160 162,190 L150,220 Q130,240 100,245 Q70,240 50,220 L38,190 Q32,160 30,120 Q28,80 32,50 Z"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={1}
        opacity={0.4}
      />

      {/* Transverse Abdominis — deepest layer, wrap around */}
      <path
        d="M46,85 Q55,95 75,100 Q100,102 125,100 Q145,95 154,85 L158,120 Q155,155 148,180 L142,195 Q125,205 100,208 Q75,205 58,195 L52,180 Q45,155 42,120 Z"
        {...mpDeep('Transverse Abdominis', hl)}
      />
      <text x="100" y="195" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.6 }}>Transverse Abd.</text>

      {/* Internal Obliques — under external obliques */}
      <path
        d="M48,55 Q44,85 42,120 Q44,155 50,185 L58,205 Q68,215 80,220 L84,210 L84,50 Q68,44 55,46 Z"
        {...mpDeep('Internal Obliques', hl)}
      />
      <path
        d="M152,55 Q156,85 158,120 Q156,155 150,185 L142,205 Q132,215 120,220 L116,210 L116,50 Q132,44 145,46 Z"
        {...mpDeep('Internal Obliques', hl)}
      />
      <text x="55" y="115" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.6 }}>Int.</text>
      <text x="55" y="124" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.6 }}>Oblique</text>
      <text x="145" y="115" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.6 }}>Int.</text>
      <text x="145" y="124" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.6 }}>Oblique</text>

      {/* External Obliques — left */}
      <path
        d="M42,50 Q38,80 36,120 Q38,160 44,190 L55,215 Q65,225 78,228 L84,220 L84,45 Q70,38 55,40 Z"
        {...mp('External Obliques', hl)}
      />
      <text x="58" y="135" textAnchor="middle" style={smallLabelStyle}>External</text>
      <text x="58" y="144" textAnchor="middle" style={smallLabelStyle}>Oblique</text>

      {/* External Obliques — right */}
      <path
        d="M158,50 Q162,80 164,120 Q162,160 156,190 L145,215 Q135,225 122,228 L116,220 L116,45 Q130,38 145,40 Z"
        {...mp('External Obliques', hl)}
      />
      <text x="142" y="135" textAnchor="middle" style={smallLabelStyle}>External</text>
      <text x="142" y="144" textAnchor="middle" style={smallLabelStyle}>Oblique</text>

      {/* Rectus Abdominis (Upper) — above navel */}
      <path
        d="M84,35 L84,136 L116,136 L116,35 Q110,30 100,28 Q90,30 84,35 Z"
        {...mp('Rectus Abdominis (Upper)', hl)}
      />
      <text x="100" y="88" textAnchor="middle" style={smallLabelStyle}>Rectus Abd.</text>
      <text x="100" y="97" textAnchor="middle" style={smallLabelStyle}>(upper)</text>

      {/* Rectus Abdominis (Lower) — below navel */}
      <path
        d="M84,136 L84,220 Q90,228 100,230 Q110,228 116,220 L116,136 Z"
        {...mp('Rectus Abdominis (Lower)', hl)}
      />
      <text x="100" y="175" textAnchor="middle" style={smallLabelStyle}>Rectus Abd.</text>
      <text x="100" y="184" textAnchor="middle" style={smallLabelStyle}>(lower)</text>

      {/* Six-pack divisions */}
      <line x1="84" y1="68" x2="116" y2="68" stroke={OUTLINE} strokeWidth={0.8} opacity={0.6} />
      <line x1="84" y1="102" x2="116" y2="102" stroke={OUTLINE} strokeWidth={0.8} opacity={0.6} />
      <line x1="84" y1="136" x2="116" y2="136" stroke={OUTLINE} strokeWidth={1} opacity={0.7} />
      <line x1="84" y1="170" x2="116" y2="170" stroke={OUTLINE} strokeWidth={0.8} opacity={0.6} />

      {/* Linea alba */}
      <line x1="100" y1="30" x2="100" y2="225" stroke={OUTLINE} strokeWidth={0.6} opacity={0.5} />

      {/* Navel marker */}
      <circle cx="100" cy="136" r="3" fill="none" stroke={OUTLINE} strokeWidth={0.6} opacity={0.4} />

      {/* Rib cage reference */}
      <path d="M50,35 Q75,25 100,23 Q125,25 150,35" fill="none" stroke={OUTLINE} strokeWidth={0.6} opacity={0.3} />
      <text x="100" y="18" textAnchor="middle" style={{ ...smallLabelStyle, opacity: 0.3 }}>ribcage</text>

      {/* Pelvis reference */}
      <path d="M55,218 Q75,235 100,238 Q125,235 145,218" fill="none" stroke={OUTLINE} strokeWidth={0.6} opacity={0.3} />
    </g>
  );
}

// ── Hip & Adductors (inner thigh / hip area, frontal view) ──
function HipDiagram({ hl }) {
  return (
    <g>
      {/* Pelvis outline */}
      <path
        d="M25,50 Q30,25 55,15 Q80,10 100,10 Q120,10 145,15 Q170,25 175,50 L178,80 Q175,110 165,130 L155,145 L100,180 L45,145 L35,130 Q25,110 22,80 Z"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={1}
        opacity={0.4}
      />

      {/* Piriformis — deep in glute, small band */}
      <path
        d="M42,52 Q50,42 65,38 Q75,38 82,42 L78,50 Q68,48 58,50 Q48,54 42,60 Z"
        {...mpDeep('Piriformis', hl)}
      />
      <path
        d="M158,52 Q150,42 135,38 Q125,38 118,42 L122,50 Q132,48 142,50 Q152,54 158,60 Z"
        {...mpDeep('Piriformis', hl)}
      />
      <text x="62" y="44" textAnchor="middle" style={{ ...smallLabelStyle, fontSize: '6.5px' }}>Piriformis</text>
      <text x="138" y="44" textAnchor="middle" style={{ ...smallLabelStyle, fontSize: '6.5px' }}>Piriformis</text>

      {/* Hip Abductors — outer hip (TFL / glute med area in frontal view) */}
      <path
        d="M30,55 Q32,40 45,28 Q55,20 65,18 L62,30 Q50,35 42,45 Q36,55 34,68 Q30,65 28,58 Z"
        {...mp('Hip Abductors', hl)}
      />
      <path
        d="M170,55 Q168,40 155,28 Q145,20 135,18 L138,30 Q150,35 158,45 Q164,55 166,68 Q170,65 172,58 Z"
        {...mp('Hip Abductors', hl)}
      />
      <text x="34" y="32" textAnchor="middle" style={smallLabelStyle}>Abd.</text>
      <text x="166" y="32" textAnchor="middle" style={smallLabelStyle}>Abd.</text>

      {/* Adductor Magnus — large inner thigh */}
      <path
        d="M80,110 L75,140 Q72,170 70,200 Q68,230 70,260 L85,265 L100,268 L115,265 L130,260 Q132,230 130,200 Q128,170 125,140 L120,110 Q110,125 100,130 Q90,125 80,110 Z"
        {...mp('Adductor Magnus', hl)}
      />
      <text x="100" y="240" textAnchor="middle" style={labelStyle}>Adductor</text>
      <text x="100" y="252" textAnchor="middle" style={labelStyle}>Magnus</text>

      {/* Adductor Longus — more superficial */}
      <path
        d="M85,105 Q82,115 80,130 L78,160 Q80,180 82,195 L100,200 L118,195 Q120,180 122,160 L120,130 Q118,115 115,105 Q108,115 100,118 Q92,115 85,105 Z"
        {...mp('Adductor Longus', hl)}
      />
      <text x="100" y="160" textAnchor="middle" style={smallLabelStyle}>Add. Longus</text>

      {/* Iliopsoas (hip flexor) — left */}
      <path
        d="M65,30 Q60,45 58,65 Q58,80 62,95 Q70,105 80,110 Q88,100 90,85 Q90,65 88,48 Q85,35 78,25 Z"
        {...mp('Hip Flexors (Iliopsoas)', hl)}
      />
      <text x="70" y="72" textAnchor="middle" style={smallLabelStyle}>Ilio-</text>
      <text x="70" y="82" textAnchor="middle" style={smallLabelStyle}>psoas</text>

      {/* Iliopsoas — right */}
      <path
        d="M135,30 Q140,45 142,65 Q142,80 138,95 Q130,105 120,110 Q112,100 110,85 Q110,65 112,48 Q115,35 122,25 Z"
        {...mp('Hip Flexors (Iliopsoas)', hl)}
      />
      <text x="130" y="72" textAnchor="middle" style={smallLabelStyle}>Ilio-</text>
      <text x="130" y="82" textAnchor="middle" style={smallLabelStyle}>psoas</text>

      {/* Gracilis — thin medial line */}
      <path
        d="M96,130 Q94,170 94,210 Q94,240 96,265 L104,265 Q106,240 106,210 Q106,170 104,130 Z"
        {...mp('Gracilis', hl)}
      />
      <text x="100" y="218" textAnchor="middle" style={smallLabelStyle}>Gracilis</text>

      {/* Pelvic bone references */}
      <path
        d="M35,40 Q45,22 70,15 Q85,12 100,11"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={0.7}
        opacity={0.3}
      />
      <path
        d="M165,40 Q155,22 130,15 Q115,12 100,11"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={0.7}
        opacity={0.3}
      />
      <text x="40" y="12" style={{ ...smallLabelStyle, opacity: 0.3 }}>iliac crest</text>

      {/* Leg direction references */}
      <path d="M70,260 L65,290" fill="none" stroke={OUTLINE} strokeWidth={0.5} opacity={0.2} />
      <path d="M130,260 L135,290" fill="none" stroke={OUTLINE} strokeWidth={0.5} opacity={0.2} />
    </g>
  );
}

// ── Group name → diagram component mapping ──
const DIAGRAM_MAP = {
  'Quadriceps': QuadsDiagram,
  'Hamstrings': HamstringsDiagram,
  'Glutes': GlutesDiagram,
  'Calves': CalvesDiagram,
  'Pecs': PecsDiagram,
  'Lats & Back': BackDiagram,
  'Deltoids': DeltoidsDiagram,
  'Biceps': BicepsDiagram,
  'Triceps': TricepsDiagram,
  'Forearms & Grip': ForearmsDiagram,
  'Abs & Core': AbsDiagram,
  'Hip & Adductors': HipDiagram,
};

const GROUP_TITLES = {
  'Quadriceps': 'Quadriceps — Anterior Thigh',
  'Hamstrings': 'Hamstrings — Posterior Thigh',
  'Glutes': 'Glutes — Posterior Hip',
  'Calves': 'Calves — Posterior Lower Leg',
  'Pecs': 'Pectorals — Anterior Chest',
  'Lats & Back': 'Lats & Back — Posterior Torso',
  'Deltoids': 'Deltoids — Shoulder',
  'Biceps': 'Biceps — Anterior Upper Arm',
  'Triceps': 'Triceps — Posterior Upper Arm',
  'Forearms & Grip': 'Forearms — Anterior Forearm',
  'Abs & Core': 'Abs & Core — Anterior Torso',
  'Hip & Adductors': 'Hip & Adductors — Inner Thigh',
};

export function AnatomyDiagram({ group, highlightMuscle }) {
  const DiagramComponent = DIAGRAM_MAP[group];

  if (!DiagramComponent) {
    return (
      <svg viewBox="0 0 200 300" style={{ width: '100%', maxWidth: 280 }}>
        <text x="100" y="150" textAnchor="middle" style={labelStyle}>
          No diagram for "{group}"
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 200 300"
      style={{
        width: '100%',
        maxWidth: 280,
        background: 'transparent',
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text x="100" y="12" style={titleStyle}>
        {GROUP_TITLES[group] || group}
      </text>
      <g transform="translate(0, 5)">
        <DiagramComponent hl={highlightMuscle} />
      </g>
    </svg>
  );
}

export default AnatomyDiagram;
