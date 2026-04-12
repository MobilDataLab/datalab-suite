import React, { useState, useMemo, useCallback, memo } from 'react';
import { Download, Trash2, Users, Layers, Building2, Upload, Database, UserPlus, FolderPlus, Link2, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

// ==================== CONSTANTES ====================
const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEPT','OCT','NOV','DIC'];

const TALLERES = {
  Ts:   { name: 'Salud',           color: '#5DADE2' },
  TI:   { name: 'Infraestructura', color: '#48C9B0' },
  TU:   { name: 'Urbano',          color: '#F4D03F' },
  Tv:   { name: 'Vivienda',        color: '#82E0AA' },
  Tc:   { name: 'Comercial',       color: '#F0A500' },
  TMP:  { name: 'Temporal',        color: '#D4C5A9' },
  MkEs: { name: 'Mkt y Estudios',  color: '#7B68A6' }
};

const ROL_COLORS = {
  DP:          '#E8A4C4',
  JT:          '#85C1E9',
  JP:          '#C0392B',
  AT:          '#D4C5A9',
  GG:          '#F5D6A7',
  'EQ ES':     '#7B8D8E',
  'EQ PR':     '#FFB6C1',
  'PL SOP':    '#2E86AB',
  'PL CONS':   '#1A5276',
  EQ_INTERNO:  '#7B8D8E',
  EQ_PRACTICA: '#FFB6C1',
  EQ_EXTERNO:  '#90EE90',
};

const SENIORITY_CONFIG = {
  S:  { name: 'Directores',        color: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  AA: { name: 'Jefes de Taller',   color: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700' },
  JP: { name: 'Jefes de Proyecto', color: 'bg-red-600',    bg: 'bg-red-50',    text: 'text-red-700' },
  AS: { name: 'Arq. Transversal',  color: 'bg-cyan-500',   bg: 'bg-cyan-50',   text: 'text-cyan-700' },
  A:  { name: 'Arquitectos',       color: 'bg-gray-500',   bg: 'bg-gray-50',   text: 'text-gray-700' },
  P:  { name: 'Práctica',          color: 'bg-pink-500',   bg: 'bg-pink-50',   text: 'text-pink-700' },
  PL: { name: 'Plataforma',        color: 'bg-teal-500',   bg: 'bg-teal-50',   text: 'text-teal-700' },
  GG: { name: 'Gerente General',   color: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700' }
};

// Ordered role groups for Personas tab — a person can appear in multiple groups
const ROLE_GROUPS = [
  { key:'DP',  name:'Directores',        roles:['DP'],              color:'bg-purple-500', bg:'bg-purple-50',  text:'text-purple-700' },
  { key:'JT',  name:'Jefes de Taller',   roles:['JT'],              color:'bg-blue-500',   bg:'bg-blue-50',    text:'text-blue-700'   },
  { key:'JP',  name:'Jefes de Proyecto', roles:['JP'],              color:'bg-red-600',    bg:'bg-red-50',     text:'text-red-700'    },
  { key:'AT',  name:'Arq. Transversal',  roles:['AT'],              color:'bg-cyan-500',   bg:'bg-cyan-50',    text:'text-cyan-700'   },
  { key:'A',   name:'Arquitectos',       roles:['EQ ES'],           color:'bg-gray-500',   bg:'bg-gray-50',    text:'text-gray-700'   },
  { key:'P',   name:'Arq. Practicante',  roles:['EQ PR'],           color:'bg-pink-500',   bg:'bg-pink-50',    text:'text-pink-700'   },
  { key:'AE',  name:'Arq. Externos',     roles:['EQ EXT'],          color:'bg-orange-500', bg:'bg-orange-50',  text:'text-orange-700' },
  { key:'PL',  name:'Arq. Plataforma',   roles:['PL SOP','PL CONS'],color:'bg-teal-500',   bg:'bg-teal-50',    text:'text-teal-700'   },
];

const ROLES = ['GG','DP','JT','JP','AT','EQ ES','EQ PR','PL SOP','PL CONS'];

// ==================== HELPERS ====================
const normalizeTaller = t =>
  ({ TV: 'Tv', TC: 'Tc', TI: 'TI', TS: 'Ts', TU: 'TU', MKES: 'MkEs', TMP: 'TMP' }[t?.toUpperCase()] || t);

// PERFIL del Excel → rol en organigrama
const perfilToRol = p => ({
  D:  'DP', JT: 'JT', JP: 'JP', AT: 'AT',
  A:  'EQ ES', P: 'EQ PR', AP: 'PL SOP'
}[p?.toUpperCase()] || 'EQ ES');

// PERFIL del Excel → seniority para agrupar en tab Personas
const perfilToSeniority = p => ({
  D: 'S', JT: 'AA', JP: 'JP', AT: 'AS', A: 'A', P: 'P', AP: 'PL', GG: 'GG'
}[p?.toUpperCase()] || 'A');

const deriveInitials = (nombre, apellido) => {
  const n = (nombre || '').trim().split(/\s+/).map(w => w[0] || '').join('');
  const a = (apellido || '').trim()[0] || '';
  return (n + a).toUpperCase().slice(0, 4);
};

const getTipoEquipo = (initials, personas) => {
  const sen = personas.find(p => p.initials?.toUpperCase() === initials?.toUpperCase())?.seniority?.toUpperCase();
  return sen === 'P' ? 'PRACTICA' : 'INTERNO';
};

const getRolColor = rol => {
  if (!rol) return ROL_COLORS['EQ ES'];
  const r = rol.toUpperCase();
  if (r === 'DP' || r === 'D')              return ROL_COLORS.DP;
  if (r === 'JT')                           return ROL_COLORS.JT;
  if (r === 'JP')                           return ROL_COLORS.JP;
  if (r === 'AT')                           return ROL_COLORS.AT;
  if (r === 'EQ PR' || r === 'P')           return ROL_COLORS.EQ_PRACTICA;
  if (r === 'PL SOP' || r === 'PL CONS' || r === 'AP') return ROL_COLORS['PL SOP'];
  return ROL_COLORS.EQ_INTERNO; // A, EQ ES, etc.
};

// ==================== UI COMPONENTS ====================
const TabBtn = memo(({ id, label, icon: Icon, active, onClick }) => (
  <button onClick={() => onClick(id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border'}`}>
    <Icon size={16} />{label}
  </button>
));

const Pie = memo(({ x, y, initials, name, ded, color, size = 26 }) => {
  const pct = Math.min(Math.max(ded || 0, 0), 100);
  const r = size / 2 - 1;
  const arc = (s, e) => {
    if (e - s >= 360) return `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r}`;
    const toR = a => (a - 90) * Math.PI / 180;
    const sp = { x: r * Math.cos(toR(s)), y: r * Math.sin(toR(s)) };
    const ep = { x: r * Math.cos(toR(e)), y: r * Math.sin(toR(e)) };
    return `M 0 0 L ${sp.x} ${sp.y} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${ep.x} ${ep.y} Z`;
  };
  return (
    <g transform={`translate(${x}, ${y})`} opacity={pct === 0 ? 0.35 : 1}>
      <title>{name ? `${name} (${initials})` : initials}: {pct}%</title>
      <circle r={r} fill={color + '35'} />
      {pct > 0 && <path d={arc(0, (pct / 100) * 360)} fill={color} />}
      <circle r={r} fill="none" stroke={color} strokeWidth="1" opacity="0.6" />
      <text textAnchor="middle" y={size * 0.12} fontSize={size * 0.34} fontWeight="bold" fill={pct > 50 ? '#fff' : '#333'}>{initials}</text>
    </g>
  );
});

// ==================== ORGCHART CONCEPTUAL ====================
const OrgChartConceptual = memo(() => {
  const W = 1000, H = 650;
  const Y = { c1: 50, c2: 120, c3: 185, c4: 255, c5: 320, c6: 385, plat: 480 };
  const dirs = [{ id: 'D1', x: 170 }, { id: 'D2', x: 375 }, { id: 'D3', x: 585 }, { id: 'D4', x: 785 }];
  const jts  = [
    { id: 'JT1', x: 75,  l: 'Ts' }, { id: 'JT2', x: 170, l: 'TI' },
    { id: 'JT3', x: 328, l: 'TU' }, { id: 'JT4', x: 480, l: 'Tv' },
    { id: 'JT5', x: 640, l: 'Tc' }, { id: 'JME', x: 890, l: 'MkEs', jme: true }
  ];
  const jps = [75, 170, 280, 375, 480, 585, 690, 785].map((x, i) => ({ id: `JP${i + 1}`, x }));
  const eqs = [75, 170, 280, 375, 480, 585, 690, 785, 890].map((x, i) => ({ id: `EQ${i + 1}`, x }));
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ backgroundColor: 'white' }}>
      <defs><marker id="arr-cy2" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#00BCD4"/></marker></defs>
      {[{y:20,h:60,c:'#FEF9E7',l:'Capa 1: GG'},{y:85,h:55,c:'#FDEDEC',l:'Capa 2: Directores'},{y:145,h:55,c:'#D4E6F1',l:'Capa 3: Jefes Taller'},{y:205,h:65,c:'#FADBD8',l:'Capa 4: Jefes Proyecto'},{y:275,h:55,c:'#FCF3CF',l:'Capa 5: Arq. Transversal'},{y:335,h:70,c:'#E5E8E8',l:'Capa 6: Equipos'}].map((cap,i)=>(
        <g key={i}><rect x={20} y={cap.y} width={940} height={cap.h} fill={cap.c} stroke="#333"/><text x={35} y={cap.y+16} fontSize={10} fill="#666">{cap.l}</text></g>
      ))}
      <circle cx={500} cy={Y.c1} r={24} fill="#C9A227" stroke="#333" strokeWidth={2}/>
      <text x={500} y={Y.c1+6} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#fff">GG</text>
      {dirs.map(d=><g key={d.id}><line x1={500} y1={Y.c1+24} x2={d.x} y2={Y.c2-20} stroke="#E8A4C4" strokeWidth={2}/><circle cx={d.x} cy={Y.c2} r={20} fill="#E8A4C4" stroke="#666"/><text x={d.x} y={Y.c2+6} textAnchor="middle" fontSize={12} fontWeight="bold">{d.id}</text></g>)}
      {jts.map(jt=><g key={jt.id}><line x1={500} y1={Y.c1+24} x2={jt.x} y2={Y.c3-16} stroke="#F5C542" strokeWidth={1.5} strokeDasharray="6,4" opacity={0.8}/><ellipse cx={jt.x} cy={Y.c3} rx={28} ry={16} fill={jt.jme?'#7B68A6':'#85C1E9'} stroke="#666"/><text x={jt.x} y={Y.c3+5} textAnchor="middle" fontSize={11} fontWeight="bold" fill={jt.jme?'#fff':'#333'}>{jt.id}</text><text x={jt.x} y={Y.c3+26} textAnchor="middle" fontSize={8} fill="#666">{jt.l}</text></g>)}
      {jps.map((jp,i)=><g key={jp.id}><line x1={dirs[Math.floor(i/2)].x} y1={Y.c2+20} x2={jp.x} y2={Y.c4-16} stroke="#3B82F6" strokeWidth={2}/><circle cx={jp.x} cy={Y.c4} r={16} fill="#C0392B" stroke="#666"/><text x={jp.x} y={Y.c4+5} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#fff">{jp.id}</text></g>)}
      {[{x:328,jt:2},{x:640,jt:4}].map((at,i)=><g key={i}><line x1={jts[at.jt].x} y1={Y.c3+16} x2={at.x} y2={Y.c5-14} stroke="#AF7AC5" strokeWidth={1.5}/><circle cx={at.x} cy={Y.c5} r={14} fill="#D4C5A9" stroke="#666"/><text x={at.x} y={Y.c5+4} textAnchor="middle" fontSize={10} fontWeight="bold">AT{i+1}</text></g>)}
      {eqs.map((eq,i)=><g key={eq.id}>{i<8&&<line x1={jps[i].x} y1={Y.c4+16} x2={eq.x} y2={Y.c6-14} stroke="#C0392B" strokeWidth={1.5}/>}<rect x={eq.x-24} y={Y.c6-14} width={48} height={28} rx={4} fill="#ABB2B9" stroke="#666"/><text x={eq.x} y={Y.c6+5} textAnchor="middle" fontSize={10} fontWeight="bold">{eq.id}</text><line x1={eq.x} y1={Y.plat-8} x2={eq.x} y2={Y.c6+18} stroke="#00BCD4" strokeWidth={2} markerEnd="url(#arr-cy2)"/></g>)}
      <rect x={50} y={Y.plat} width={900} height={90} fill="#D5F5E3" stroke="#1E8449" strokeWidth={2} strokeDasharray="8,4" rx={8}/>
      <text x={80} y={Y.plat+24} fontSize={12} fontWeight="bold" fill="#1E8449">Plataforma (Soporte Transversal)</text>
      {['BIM','EC','CD','CS','CO','CN'].map((p,i)=><g key={p} transform={`translate(${130+i*150},${Y.plat+55})`}><circle r={22} fill="#1A5276" stroke="#666"/><text textAnchor="middle" y={6} fontSize={11} fontWeight="bold" fill="#fff">{p}</text></g>)}
    </svg>
  );
});

// ==================== ORGCHART REAL ====================
const OrgChartReal = memo(({ proyectos, asignaciones, personas, selectedMonth }) => {
  const tallerList = ['Ts','TI','TU','Tv','Tc','TMP','MkEs'];

  // Compute dedicacion for selected month
  const getDed = useCallback((a) => {
    if (!a.horasMensuales) return a.dedicacion || 0;
    const h = a.horasMensuales[selectedMonth] || 0;
    return Math.round((h / 160) * 100);
  }, [selectedMonth]);

  const { layout, W } = useMemo(() => {
    const layout = { proyectos: {}, talleres: {} };
    let curX = 200;
    tallerList.forEach(tid => {
      const tProj = proyectos.filter(p => p.taller === tid);
      if (!tProj.length) {
        layout.talleres[tid] = { startX: curX, endX: curX+80, centerX: curX+40, width: 80 };
        curX += 120; return;
      }
      const startX = curX;
      tProj.forEach((p, i) => { layout.proyectos[p.code] = { x: startX + i * 90 + 45 }; curX += 90; });
      layout.talleres[tid] = { startX, endX: curX, centerX: startX + (curX - startX) / 2, width: curX - startX };
      curX += 50;
    });
    return { layout, W: Math.max(1600, curX + 200) };
  }, [proyectos]);

  const asnByProyRol = useMemo(() => {
    const idx = {};
    asignaciones.forEach(a => {
      const k = `${a.proyectoCode?.toUpperCase()}||${a.rol?.toUpperCase()}`;
      if (!idx[k]) idx[k] = [];
      idx[k].push(a);
    });
    return idx;
  }, [asignaciones]);

  const getByRol = (code, rol) => asnByProyRol[`${code?.toUpperCase()}||${rol?.toUpperCase()}`] || [];

  // Max team depth for dynamic SVG height
  const maxTeamDepth = useMemo(() => {
    let max = 0;
    proyectos.forEach(pr => {
      const eq = [...getByRol(pr.code,'EQ ES'), ...getByRol(pr.code,'EQ PR'), ...getByRol(pr.code,'PL SOP')];
      if (eq.length > max) max = eq.length;
    });
    return max;
  }, [proyectos, asnByProyRol]);

  // Lookup persona full name by initials (for tooltips)
  // Maps resolved initials → persona name and raw initials
  const personaByInitials = useMemo(() => {
    const m = {};
    personas.forEach(p => { if (p.initials) m[p.initials.toUpperCase()] = { name: p.name }; });
    return m;
  }, [personas]);
  const pName = ini => personaByInitials[(ini||'').toUpperCase()]?.name || null;

  const getJT = tid => {
    const jtMap = new Map();
    proyectos.filter(p => p.taller === tid).forEach(p =>
      getByRol(p.code, 'JT').forEach(j => {
        const k = j.personaInitials?.toUpperCase();
        if (k) jtMap.set(k, { initials: j.personaInitials, ded: (jtMap.get(k)?.ded||0)+(getDed(j)||0) });
      })
    );
    let main = null; jtMap.forEach(j => { if (!main || j.ded > main.ded) main = j; }); return main;
  };

  const EQ_STEP = 28;
  const Y = {
    c1: 80, c2: 170, c3: 270, lbl: 340,
    c4: 410,  // JP
    c5: 490,  // AT
    c6: 560,  // EQ start (vertical stacking from here)
  };
  const eqAreaHeight = Math.max(maxTeamDepth * EQ_STEP + 20, 80);
  const platY = Y.c6 + eqAreaHeight + 40;
  const H = platY + 160;

  // Legend items
  const legend = [
    { c: ROL_COLORS.DP, l: 'Director (D)' },
    { c: ROL_COLORS.JT, l: 'Jefe Taller (JT)' },
    { c: ROL_COLORS.JP, l: 'Jefe Proyecto (JP)' },
    { c: ROL_COLORS.AT, l: 'Arq. Transversal (AT)' },
    { c: ROL_COLORS.EQ_INTERNO, l: 'Equipo (A)' },
    { c: ROL_COLORS.EQ_PRACTICA, l: 'Práctica (P)' },
    { c: ROL_COLORS['PL SOP'], l: 'Plataforma (AP)' },
  ];

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ backgroundColor:'white', fontFamily:'Arial Narrow,Arial,sans-serif' }}>
      <defs>
        <marker id="arr-pk" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto"><polygon points="0 0,6 2.5,0 5" fill="#E8A4C4"/></marker>
        <marker id="arr-bl" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto"><polygon points="0 0,6 2.5,0 5" fill="#85C1E9"/></marker>
        <marker id="arr-cy" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto"><polygon points="0 0,6 2.5,0 5" fill="#00BCD4"/></marker>
      </defs>

      {/* Leyenda */}
      <g transform="translate(10,15)">
        {legend.map((it,i)=>(
          <g key={i} transform={`translate(0,${i*16})`}>
            <circle cx={6} cy={6} r={5} fill={it.c}/>
            <text x={16} y={10} fontSize={9} fill="#444">{it.l}</text>
          </g>
        ))}
      </g>

      {/* Líneas horizontales separadoras de capas */}
      <line x1={160} y1={Y.c2+30} x2={W-20} y2={Y.c2+30} stroke="#eee" strokeWidth={1}/>
      <line x1={160} y1={Y.c4+32} x2={W-20} y2={Y.c4+32} stroke="#eee" strokeWidth={1}/>
      <line x1={160} y1={Y.c5+28} x2={W-20} y2={Y.c5+28} stroke="#eee" strokeWidth={1}/>

      {/* GG */}
      <circle cx={W/2} cy={Y.c1} r={32} fill={ROL_COLORS.GG} stroke="#888" strokeWidth={2}/>
      <text x={W/2} y={Y.c1+7} textAnchor="middle" fontSize={20} fontWeight="bold">GG</text>

      {/* Talleres */}
      {tallerList.map(tid => {
        const tl = layout.talleres[tid]; if (!tl) return null;
        const jt = getJT(tid);
        const tc = TALLERES[tid]?.color || '#ccc';
        const dedJT = jt ? getDed(asignaciones.find(a => a.personaInitials?.toUpperCase() === jt.initials?.toUpperCase()) || {}) : 0;
        return (
          <g key={tid}>
            {/* Taller box */}
            <rect x={tl.startX-8} y={Y.c3-42} width={tl.width+16} height={H - Y.c3 - 60} fill={tc+'06'} stroke={tc} strokeDasharray="5,3" strokeWidth={1.5} rx={8}/>
            <text x={tl.centerX} y={Y.c3-24} textAnchor="middle" fontSize={14} fontWeight="bold" fill={tc}>{tid}</text>
            <text x={tl.centerX} y={Y.c3-10} textAnchor="middle" fontSize={9} fill="#999">{TALLERES[tid]?.name}</text>
            {/* JT */}
            {jt && <>
              <line x1={W/2} y1={Y.c1+32} x2={tl.centerX} y2={Y.c3-6} stroke="#F5C542" strokeWidth={1.5} strokeDasharray="5,3" opacity={0.6}/>
              <Pie x={tl.centerX} y={Y.c3+8} initials={jt.initials} name={pName(jt.initials)} ded={jt.ded} color={ROL_COLORS.JT} size={34}/>
            </>}
          </g>
        );
      })}

      {/* Proyectos */}
      {proyectos.map(pr => {
        const pos = layout.proyectos[pr.code]; if (!pos) return null;
        const x = pos.x;
        const tl = layout.talleres[pr.taller];

        const dp  = getByRol(pr.code, 'DP');
        const jp  = getByRol(pr.code, 'JP');
        const at  = getByRol(pr.code, 'AT');
        const eq  = [
          ...getByRol(pr.code, 'EQ ES').map(e=>({...e, tipo:'INT'})),
          ...getByRol(pr.code, 'EQ PR').map(e=>({...e, tipo:'PRA'})),
          ...getByRol(pr.code, 'PL SOP').map(e=>({...e, tipo:'PL'})),
        ];

        return (
          <g key={pr.id}>
            {/* Etiqueta proyecto */}
            <text x={x} y={Y.lbl} textAnchor="middle" fontSize={8} fill="#555"
              transform={`rotate(-55,${x},${Y.lbl})`}>{pr.code}</text>

            {/* Director (DP) */}
            {dp.slice(0,1).map((d,i) => {
              const ded = getDed(d);
              return <g key={i}>
                <line x1={W/2} y1={Y.c1+32} x2={x} y2={Y.c2-14} stroke="#E8A4C4" strokeWidth={1} opacity={0.3}/>
                <Pie x={x} y={Y.c2} initials={d.personaInitials} name={pName(d.personaInitials)} ded={ded} color={ROL_COLORS.DP} size={28}/>
              </g>;
            })}

            {/* JP */}
            {jp.map((j,i) => {
              const ded = getDed(j);
              const jx = x + (i - (jp.length-1)/2) * 28;
              return <g key={i}>
                {dp.length>0 && <line x1={x} y1={Y.c2+14} x2={jx} y2={Y.c4-14} stroke="#E8A4C4" strokeWidth={1} markerEnd="url(#arr-pk)" opacity={0.6}/>}
                {tl && <line x1={tl.centerX} y1={Y.c3+22} x2={jx} y2={Y.c4-14} stroke="#85C1E9" strokeWidth={0.8} opacity={0.5} markerEnd="url(#arr-bl)"/>}
                <Pie x={jx} y={Y.c4} initials={j.personaInitials} name={pName(j.personaInitials)} ded={ded} color={ROL_COLORS.JP} size={30}/>
              </g>;
            })}

            {/* AT */}
            {at.map((a,i) => {
              const ded = getDed(a);
              const ax = x + (i - (at.length-1)/2) * 26;
              return <g key={i}>
                {tl && <line x1={tl.centerX} y1={Y.c3+22} x2={ax} y2={Y.c5-12} stroke="#85C1E9" strokeWidth={0.8} strokeDasharray="3,2" opacity={0.4}/>}
                <Pie x={ax} y={Y.c5} initials={a.personaInitials} name={pName(a.personaInitials)} ded={ded} color={ROL_COLORS.AT} size={26}/>
              </g>;
            })}

            {/* EQ — stacked vertically */}
            {eq.map((e, i) => {
              const ded = getDed(e);
              const col = e.tipo === 'PRA' ? ROL_COLORS.EQ_PRACTICA : e.tipo === 'PL' ? ROL_COLORS['PL SOP'] : ROL_COLORS.EQ_INTERNO;
              const ey = Y.c6 + i * EQ_STEP;
              return <g key={i}>
                {i === 0 && jp.length > 0 && <line x1={x} y1={Y.c4+16} x2={x} y2={Y.c6-10} stroke="#C0392B" strokeWidth={0.8} opacity={0.25}/>}
                <Pie x={x} y={ey} initials={e.personaInitials} name={pName(e.personaInitials)} ded={ded} color={col} size={24}/>
              </g>;
            })}
          </g>
        );
      })}

      {/* Plataforma */}
      <rect x={30} y={platY-10} width={W-80} height={100} fill="#D5F5E3" stroke="#1E8449" strokeWidth={2} strokeDasharray="6,3" rx={8}/>
      <text x={55} y={platY+12} fontSize={13} fontWeight="bold" fill="#1E8449">Plataforma (Soporte Transversal)</text>
      {tallerList.map(tid => {
        const tl = layout.talleres[tid];
        return tl ? <line key={tid} x1={tl.centerX} y1={platY-10} x2={tl.centerX} y2={Y.c6 + eqAreaHeight - 10} stroke="#00BCD4" strokeWidth={1.5} strokeDasharray="4,3" markerEnd="url(#arr-cy)" opacity={0.7}/> : null;
      })}
    </svg>
  );
});

// ==================== IMPORT MODAL ====================
const ImportModal = memo(({ onClose, onImport }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg flex items-center gap-2 m-0"><Upload size={20} className="text-green-600"/>Importar Excel</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
      </div>
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm space-y-2">
          <p className="font-medium text-blue-800">Hoja <span className="font-mono bg-blue-100 px-1 rounded">HORAS</span> — columnas requeridas:</p>
          <p className="font-mono text-xs text-blue-700 bg-blue-100 p-2 rounded">PROYECTO | TALLER | APELLIDO | NOMBRE | PERFIL | ENE…DIC</p>
          <div className="text-blue-700 text-xs space-y-1">
            <p><span className="font-semibold">PERFIL:</span> D (Director) · JT (Jefe Taller) · JP (Jefe Proyecto) · AT (Arq. Transversal) · A (Arquitecto) · P (Practicante) · AP (Arq. Plataforma)</p>
            <p><span className="font-semibold">TALLER:</span> TV · TC · TI · TS · TU · TMP</p>
          </div>
        </div>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
          <input type="file" accept=".xlsx,.xls" onChange={onImport} className="hidden" id="excel-upload"/>
          <label htmlFor="excel-upload" className="cursor-pointer block">
            <Upload size={40} className="mx-auto text-gray-400 mb-2"/>
            <p className="text-sm font-medium text-gray-600">Seleccionar archivo Excel</p>
            <p className="text-xs text-gray-400 mt-1">Ej: Talleres 2026 abril.xlsx</p>
          </label>
        </div>
      </div>
    </div>
  </div>
));

// ==================== COMPONENTE PRINCIPAL ====================
export default function MobilOrg() {
  const [tab, setTab]           = useState('orgchart');
  const [subTab, setSubTab]     = useState('conceptual');
  const [showImport, setShowImport] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(3); // ABR default
  const [personas, setPersonas]         = useState([]);
  const [proyectos, setProyectos]       = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [newPersona,    setNewPersona]    = useState({ initials:'', name:'', seniority:'A' });
  const [newProyecto,   setNewProyecto]   = useState({ name:'', code:'', taller:'Ts' });
  const [newAsignacion, setNewAsignacion] = useState({ personaId:'', proyectoId:'', rol:'EQ ES', dedicacion:100 });

  // Dedicacion index for selected month — keyed by personaId (not initials, to handle duplicate initials correctly)
  const dedicacionIndex = useMemo(() =>
    asignaciones.reduce((acc, a) => {
      const k = a.personaId;
      if (!k) return acc;
      const h = a.horasMensuales ? (a.horasMensuales[selectedMonth] || 0) : 0;
      const ded = a.horasMensuales ? Math.round((h / 160) * 100) : (a.dedicacion || 0);
      acc[k] = (acc[k] || 0) + ded;
      return acc;
    }, {}),
    [asignaciones, selectedMonth]);

  const getDed = useCallback(id => dedicacionIndex[id] || 0, [dedicacionIndex]);

  // ---- IMPORT ----
  const handleImport = useCallback(e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result), { type:'array' });
        const ws = wb.Sheets['HORAS'];
        if (!ws) throw new Error('No se encontró la hoja HORAS en el archivo');

        const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });

        // Detect column positions from header rows (search first 3 rows)
        const normalize = s => (s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        let hdrRow = null, hdrIdx = -1;
        for (let i = 0; i < Math.min(3, rows.length); i++) {
          const r = rows[i] || [];
          const vals = r.map(c => normalize(String(c||'')));
          if (vals.includes('proyecto') && (vals.includes('iniciales') || vals.includes('perfil'))) {
            hdrRow = vals; hdrIdx = i; break;
          }
        }
        // Column indices — fall back to hardcoded defaults if header not found
        const ci = hdrRow ? {
          proyecto:  hdrRow.indexOf('proyecto'),
          taller:    hdrRow.indexOf('taller'),
          apellido:  hdrRow.indexOf('apellido'),
          nombre:    hdrRow.indexOf('nombre'),
          iniciales: hdrRow.indexOf('iniciales'),
          perfil:    hdrRow.indexOf('perfil'),
          ene:       hdrRow.indexOf('ene'),
        } : { proyecto:1, taller:2, apellido:3, nombre:4, iniciales:5, perfil:6, ene:7 };
        if (ci.ene < 0) ci.ene = ci.perfil + 1;          // fallback if ENE not labelled
        if (ci.iniciales < 0) ci.iniciales = ci.perfil - 1; // fallback: INICIALES is just before PERFIL

        const dataStart = hdrIdx >= 0 ? hdrIdx + 1 : 2;
        const dataRows = rows.slice(dataStart).filter(r =>
          r[ci.proyecto] && r[ci.iniciales] && r[ci.perfil]
        );
        const ts = Date.now();

        // --- Personas ---
        // Dedup same person (same ini+apellido+nombre) appearing on multiple project rows.
        // No collision resolution — initials from Excel are used exactly as written.
        const personaKeys = new Map(); // normKey → {initials, nombre, apellido, perfil}

        dataRows.forEach(r => {
          const ini  = String(r[ci.iniciales]||'').trim().toUpperCase();
          const ape  = String(r[ci.apellido]||'').trim();
          const nom  = String(r[ci.nombre]||'').trim();
          const perf = String(r[ci.perfil]||'A').trim().toUpperCase();
          if (!ini) return;
          const normKey = `${ini}||${normalize(ape)}||${normalize(nom)}`;
          if (!personaKeys.has(normKey))
            personaKeys.set(normKey, { initials: ini, nombre: nom, apellido: ape, perfil: perf });
        });

        // Build pMap: normKey → {id, initials}
        let pIdx = 0;
        const newPersonas = [], pMap = new Map();
        personaKeys.forEach((p, normKey) => {
          const id = `p-${ts}-${pIdx++}`;
          pMap.set(normKey, { id, initials: p.initials });
          const fullName = [p.nombre, p.apellido].filter(Boolean).join(' ') || p.initials;
          newPersonas.push({ id, initials: p.initials, name: fullName, seniority: perfilToSeniority(p.perfil) });
        });

        // --- Proyectos ---
        const proyectosSeen = new Map();
        dataRows.forEach(r => {
          const code   = String(r[ci.proyecto]||'').trim();
          const taller = normalizeTaller(String(r[ci.taller]||'Tv').trim());
          if (!code || code==='PROYECTO') return;
          if (!proyectosSeen.has(code.toUpperCase())) proyectosSeen.set(code.toUpperCase(), { code, taller });
        });
        const newProyectos = [], prMap = new Map();
        proyectosSeen.forEach((p, key) => {
          const id = `proj-${p.code.toLowerCase().replace(/[^a-z0-9]/g,'-')}-${ts}-${newProyectos.length}`;
          prMap.set(key, id);
          newProyectos.push({ id, code: p.code, name: p.code, taller: p.taller });
        });

        // --- Asignaciones ---
        const newAsignaciones = [];
        dataRows.forEach((r, i) => {
          const ini  = String(r[ci.iniciales]||'').trim().toUpperCase();
          const ape  = String(r[ci.apellido]||'').trim();
          const nom  = String(r[ci.nombre]||'').trim();
          const perf = String(r[ci.perfil]||'A').trim().toUpperCase();
          const code = String(r[ci.proyecto]||'').trim();
          if (!ini||!code||code==='PROYECTO') return;

          const normKey = `${ini}||${normalize(ape)}||${normalize(nom)}`;
          const pInfo   = pMap.get(normKey);
          const prId    = prMap.get(code.toUpperCase());
          if (!pInfo||!prId) return;

          const horasMensuales = Array.from({length:12}, (_,mi) => {
            const h = r[ci.ene+mi];
            return typeof h === 'number' ? h : parseFloat(h) || 0;
          });
          if (horasMensuales.reduce((s,h)=>s+h,0) <= 0) return;

          const abrH   = horasMensuales[3];
          const nonZero = horasMensuales.filter(h=>h>0);
          const refH   = abrH > 0 ? abrH : (nonZero.length ? nonZero.reduce((s,h)=>s+h,0)/nonZero.length : 0);

          newAsignaciones.push({
            id: `a-${ts}-${i}`,
            personaId:       pInfo.id,
            proyectoId:      prId,
            personaInitials: pInfo.initials,
            proyectoCode:    code,
            perfil:          perf,
            rol:             perfilToRol(perf),
            horasMensuales,
            dedicacion:      Math.round((refH/160)*100),
          });
        });

        setPersonas(newPersonas);
        setProyectos(newProyectos);
        setAsignaciones(newAsignaciones);
        setShowImport(false);
        alert(`✅ Importado: ${newPersonas.length} personas, ${newProyectos.length} proyectos, ${newAsignaciones.length} asignaciones`);
      } catch(err) { alert('Error: '+err.message); }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const exportJSON = useCallback(() => {
    const data = {
      mes: MESES[selectedMonth],
      personas:     personas.map(p=>({initials:p.initials,name:p.name,seniority:p.seniority})),
      proyectos:    proyectos.map(p=>({code:p.code,taller:p.taller})),
      asignaciones: asignaciones.map(a=>({persona:a.personaInitials,proyecto:a.proyectoCode,rol:a.rol,dedicacion:a.horasMensuales?Math.round((a.horasMensuales[selectedMonth]||0)/160*100):a.dedicacion}))
    };
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const link = document.createElement('a'); link.href=URL.createObjectURL(blob); link.download=`MOBIL_${MESES[selectedMonth]}_${new Date().getFullYear()}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }, [personas,proyectos,asignaciones,selectedMonth]);

  const downloadSVG = useCallback(title => {
    const svg = document.querySelector('svg[viewBox]'); if(!svg) return alert('No hay organigrama');
    const clone = svg.cloneNode(true); clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('width','100%'); rect.setAttribute('height','100%'); rect.setAttribute('fill','white');
    clone.insertBefore(rect,clone.firstChild);
    const blob = new Blob(['<?xml version="1.0"?>\n'+new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'});
    const link = document.createElement('a'); link.href=URL.createObjectURL(blob); link.download=`${title}_${MESES[selectedMonth]}_MOBIL.svg`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }, [selectedMonth]);

  const addPersona = useCallback(()=>{ if(!newPersona.initials||!newPersona.name) return alert('Completa datos'); setPersonas(p=>[...p,{...newPersona,id:`p-${Date.now()}`,initials:newPersona.initials.toUpperCase()}]); setNewPersona({initials:'',name:'',seniority:'A'}); },[newPersona]);
  const addProyecto = useCallback(()=>{ if(!newProyecto.name) return alert('Completa nombre'); setProyectos(p=>[...p,{...newProyecto,id:`pr-${Date.now()}`,code:newProyecto.code||newProyecto.name}]); setNewProyecto({name:'',code:'',taller:'Ts'}); },[newProyecto]);
  const addAsignacion = useCallback(()=>{
    if(!newAsignacion.personaId||!newAsignacion.proyectoId) return alert('Selecciona persona y proyecto');
    const persona  = personas.find(p=>p.id===newAsignacion.personaId);
    const proyecto = proyectos.find(p=>p.id===newAsignacion.proyectoId);
    setAsignaciones(a=>[...a,{...newAsignacion,id:`a-${Date.now()}`,personaInitials:persona?.initials,proyectoCode:proyecto?.code}]);
    setNewAsignacion({personaId:'',proyectoId:'',rol:'EQ ES',dedicacion:100});
  },[newAsignacion,personas,proyectos]);

  // Month selector component (inline)
  const MonthSelector = (
    <div className="flex items-center gap-2">
      <Calendar size={15} className="text-gray-500"/>
      <span className="text-xs text-gray-500 font-medium">Mes:</span>
      <div className="flex gap-1">
        {MESES.map((m,i)=>(
          <button key={m} onClick={()=>setSelectedMonth(i)}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${selectedMonth===i?'bg-blue-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {m}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen" style={{fontFamily:'Arial Narrow,Arial,sans-serif'}}>
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-3">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 m-0"><Building2 className="text-blue-400" size={20}/>MOBIL Arquitectos — Sistema Organizacional</h1>
            <p className="text-slate-400 text-xs mt-1">Gestión de Personas, Proyectos y Asignaciones</p>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="bg-slate-800 px-3 py-1 rounded-full text-xs">👥 {personas.length}</span>
            <span className="bg-slate-800 px-3 py-1 rounded-full text-xs">📁 {proyectos.length}</span>
            <span className="bg-slate-800 px-3 py-1 rounded-full text-xs">🔗 {asignaciones.length}</span>
          </div>
        </div>
      </div>

      {/* Month selector bar */}
      <div className="bg-slate-800 px-6 py-2 flex items-center gap-4">
        {MonthSelector}
      </div>

      {/* Nav */}
      <div className="bg-white border-b px-6 py-3 flex gap-3 flex-wrap items-center">
        <TabBtn id="orgchart"     label="Organigrama"  icon={Layers}     active={tab==='orgchart'}     onClick={setTab}/>
        <TabBtn id="personas"     label="Personas"     icon={Users}      active={tab==='personas'}     onClick={setTab}/>
        <TabBtn id="proyectos"    label="Proyectos"    icon={FolderPlus} active={tab==='proyectos'}    onClick={setTab}/>
        <TabBtn id="asignaciones" label="Asignaciones" icon={Link2}      active={tab==='asignaciones'} onClick={setTab}/>
        <div className="ml-auto flex gap-2">
          {personas.length>0&&<button onClick={exportJSON} className="flex items-center gap-2 px-4 py-2 border-2 border-blue-500 text-blue-600 rounded-lg text-sm hover:bg-blue-50"><Download size={16}/>JSON</button>}
          <button onClick={()=>setShowImport(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"><Upload size={16}/>Importar Excel</button>
        </div>
      </div>

      <div className="p-6">

        {/* ORGANIGRAMA */}
        {tab==='orgchart'&&(
          <div className="space-y-4">
            <div className="flex gap-3 items-center flex-wrap">
              <span className="text-sm font-medium text-gray-600">Vista:</span>
              <button onClick={()=>setSubTab('conceptual')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subTab==='conceptual'?'bg-purple-600 text-white':'bg-white border hover:bg-gray-50'}`}>📊 Conceptual</button>
              <button onClick={()=>setSubTab('real')}       className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subTab==='real'?'bg-purple-600 text-white':'bg-white border hover:bg-gray-50'}`}>👥 Real — {MESES[selectedMonth]}</button>
              <div className="ml-auto flex gap-2">
                <button onClick={exportJSON}                        className="flex items-center gap-1 bg-amber-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-amber-600"><Database size={14}/>JSON</button>
                <button onClick={()=>downloadSVG(`Org_${subTab}`)} className="flex items-center gap-1 bg-white border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"><Download size={14}/>SVG</button>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-auto p-4">
              {subTab==='conceptual'
                ?<OrgChartConceptual/>
                :<OrgChartReal proyectos={proyectos} asignaciones={asignaciones} personas={personas} selectedMonth={selectedMonth}/>}
            </div>
          </div>
        )}

        {/* PERSONAS */}
        {tab==='personas'&&(
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 m-0"><UserPlus size={18} className="text-blue-600"/>Agregar Persona</h3>
              <div className="grid grid-cols-5 gap-3 mt-3">
                <input placeholder="Iniciales *" value={newPersona.initials} onChange={e=>setNewPersona({...newPersona,initials:e.target.value.toUpperCase()})} className="border rounded-lg px-3 py-2 text-sm" maxLength={4}/>
                <input placeholder="Nombre *"    value={newPersona.name}     onChange={e=>setNewPersona({...newPersona,name:e.target.value})} className="border rounded-lg px-3 py-2 text-sm col-span-2"/>
                <select value={newPersona.seniority} onChange={e=>setNewPersona({...newPersona,seniority:e.target.value})} className="border rounded-lg px-3 py-2 text-sm">
                  {Object.entries(SENIORITY_CONFIG).map(([k,v])=><option key={k} value={k}>{v.name} ({k})</option>)}
                </select>
                <button onClick={addPersona} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700">+ Agregar</button>
              </div>
            </div>
            {personas.length===0
              ?<div className="bg-white rounded-xl border p-8 text-center text-gray-400">No hay personas. Importa el Excel para comenzar.</div>
              :ROLE_GROUPS.map(grp=>{
                // Collect unique personas in this role group, with per-role and total dedication
                const seen=new Set();
                const entries=[];
                asignaciones.forEach(a=>{
                  if(!grp.roles.includes(a.rol)) return;
                  const pid=a.personaId;
                  if(!pid||seen.has(pid)) return;
                  seen.add(pid);
                  const persona=personas.find(p=>p.id===pid);
                  if(!persona) return;
                  const rolDed=asignaciones
                    .filter(x=>x.personaId===pid&&grp.roles.includes(x.rol))
                    .reduce((sum,x)=>{
                      const h=x.horasMensuales?(x.horasMensuales[selectedMonth]||0):0;
                      return sum+(x.horasMensuales?Math.round((h/160)*100):(x.dedicacion||0));
                    },0);
                  entries.push({persona,rolDed,totalDed:getDed(pid)});
                });
                if(!entries.length) return null;
                return <div key={grp.key} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className={`${grp.bg} px-4 py-2 border-b flex items-center gap-2`}>
                    <span className={`w-3 h-3 rounded-full ${grp.color}`}/>
                    <span className={`font-bold ${grp.text}`}>{grp.name}</span>
                    <span className="text-gray-400 text-sm">({entries.length})</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2">Iniciales</th>
                        <th className="text-left px-4 py-2">Nombre</th>
                        <th className="text-left px-4 py-2">% en Rol {MESES[selectedMonth]}</th>
                        <th className="text-left px-4 py-2">% Total</th>
                        <th className="w-12"/>
                      </tr>
                    </thead>
                    <tbody>{entries.map(({persona:p,rolDed,totalDed})=>(
                      <tr key={`${grp.key}-${p.id}`} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2"><span className={`inline-flex items-center justify-center w-9 h-9 rounded-full ${grp.color} text-white font-bold text-xs`}>{p.initials}</span></td>
                        <td className="px-4 py-2 font-medium">{p.name}</td>
                        <td className="px-4 py-2"><div className="flex items-center gap-2">
                          <div className="w-28 bg-gray-200 rounded-full h-2"><div className={`h-2 rounded-full ${rolDed>100?'bg-red-500':rolDed>=80?'bg-green-500':rolDed>0?'bg-yellow-500':'bg-gray-300'}`} style={{width:`${Math.min(rolDed,100)}%`}}/></div>
                          <span className={`text-xs font-bold ${rolDed>100?'text-red-600':rolDed>=80?'text-green-600':rolDed>0?'text-yellow-600':'text-gray-400'}`}>{rolDed}%</span>
                        </div></td>
                        <td className="px-4 py-2"><span className={`text-xs font-bold ${totalDed>100?'text-red-600':totalDed>=80?'text-green-600':totalDed>0?'text-yellow-600':'text-gray-400'}`}>{totalDed}%</span></td>
                        <td className="px-4 py-2 text-center"><button onClick={()=>{setPersonas(ps=>ps.filter(x=>x.id!==p.id));setAsignaciones(as=>as.filter(a=>a.personaId!==p.id));}} className="text-red-400 hover:text-red-600"><Trash2 size={15}/></button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>;
              })
            }
          </div>
        )}

        {/* PROYECTOS */}
        {tab==='proyectos'&&(
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 m-0"><FolderPlus size={18} className="text-green-600"/>Agregar Proyecto</h3>
              <div className="grid grid-cols-5 gap-3 mt-3">
                <input placeholder="Nombre *" value={newProyecto.name} onChange={e=>setNewProyecto({...newProyecto,name:e.target.value})} className="border rounded-lg px-3 py-2 text-sm col-span-2"/>
                <input placeholder="Código"   value={newProyecto.code} onChange={e=>setNewProyecto({...newProyecto,code:e.target.value.toUpperCase()})} className="border rounded-lg px-3 py-2 text-sm"/>
                <select value={newProyecto.taller} onChange={e=>setNewProyecto({...newProyecto,taller:e.target.value})} className="border rounded-lg px-3 py-2 text-sm">
                  {Object.entries(TALLERES).map(([k,v])=><option key={k} value={k}>{k} - {v.name}</option>)}
                </select>
                <button onClick={addProyecto} className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-green-700">+ Agregar</button>
              </div>
            </div>
            {proyectos.length===0
              ?<div className="bg-white rounded-xl border p-8 text-center text-gray-400">No hay proyectos. Importa el Excel para comenzar.</div>
              :Object.entries(TALLERES).map(([tid,t])=>{
                const tPr=proyectos.filter(p=>p.taller===tid); if(!tPr.length) return null;
                return <div key={tid} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b flex items-center gap-3"><span className="w-3 h-3 rounded-full" style={{backgroundColor:t.color}}/><span className="font-bold">{tid} - {t.name}</span><span className="text-gray-400 text-sm">({tPr.length})</span></div>
                  <table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-left px-3 py-2">Código</th><th className="text-left px-3 py-2">Nombre</th><th className="w-12"/></tr></thead>
                  <tbody>{tPr.map(p=><tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{p.code}</td>
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-2 py-2 text-center"><button onClick={()=>{setProyectos(ps=>ps.filter(x=>x.id!==p.id));setAsignaciones(as=>as.filter(a=>a.proyectoId!==p.id));}} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button></td>
                  </tr>)}</tbody></table>
                </div>;
              })
            }
          </div>
        )}

        {/* ASIGNACIONES */}
        {tab==='asignaciones'&&(
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 m-0"><Link2 size={18} className="text-purple-600"/>Nueva Asignación</h3>
              <div className="grid grid-cols-6 gap-3 mt-3">
                <select value={newAsignacion.personaId}  onChange={e=>setNewAsignacion({...newAsignacion,personaId:e.target.value})}  className="border rounded-lg px-3 py-2 text-sm col-span-2"><option value="">Persona...</option>{personas.map(p=><option key={p.id} value={p.id}>{p.initials} - {p.name}</option>)}</select>
                <select value={newAsignacion.proyectoId} onChange={e=>setNewAsignacion({...newAsignacion,proyectoId:e.target.value})} className="border rounded-lg px-3 py-2 text-sm"><option value="">Proyecto...</option>{proyectos.map(p=><option key={p.id} value={p.id}>{p.code} ({p.taller})</option>)}</select>
                <select value={newAsignacion.rol}        onChange={e=>setNewAsignacion({...newAsignacion,rol:e.target.value})}        className="border rounded-lg px-3 py-2 text-sm">{ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select>
                <div className="flex items-center gap-2"><input type="number" min="1" max="200" value={newAsignacion.dedicacion} onChange={e=>setNewAsignacion({...newAsignacion,dedicacion:parseInt(e.target.value)||0})} className="border rounded-lg px-3 py-2 text-sm w-20"/><span className="text-sm text-gray-500">%</span></div>
                <button onClick={addAsignacion} className="bg-purple-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-purple-700">+ Asignar</button>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3">Proyecto</th>
                    <th className="text-left px-4 py-3">Persona</th>
                    <th className="text-left px-4 py-3">Rol</th>
                    <th className="text-left px-4 py-3">Ded. {MESES[selectedMonth]}</th>
                    {asignaciones.some(a=>a.horasMensuales) && MESES.map(m=><th key={m} className="text-center px-1 py-3 text-xs text-gray-400 font-normal w-12">{m}</th>)}
                    <th className="w-12"/>
                  </tr>
                </thead>
                <tbody>
                  {asignaciones.length===0
                    ?<tr><td colSpan={10} className="text-center py-8 text-gray-400">No hay asignaciones. Importa el Excel o agrega manualmente.</td></tr>
                    :asignaciones.map(a => {
                      const ded = a.horasMensuales ? Math.round((a.horasMensuales[selectedMonth]||0)/160*100) : (a.dedicacion||0);
                      const rolColor = getRolColor(a.rol);
                      const displayRol = a.perfil || a.rol || '-';
                      return <tr key={a.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs font-medium">{a.proyectoCode}</td>
                        <td className="px-4 py-2"><span className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{backgroundColor: rolColor}}>{a.personaInitials}</span></td>
                        <td className="px-4 py-2"><span className="px-2 py-1 rounded text-xs font-bold text-white" style={{backgroundColor: rolColor}}>{displayRol}</span></td>
                        <td className="px-4 py-2"><div className="flex items-center gap-2"><div className="w-12 bg-gray-200 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{width:`${Math.min(ded,100)}%`, backgroundColor: rolColor}}/></div><span className="text-xs font-bold">{ded}%</span></div></td>
                        {a.horasMensuales && a.horasMensuales.map((h,mi)=><td key={mi} className={`text-center px-1 py-2 text-xs ${mi===selectedMonth?'bg-blue-50 font-bold text-blue-700':'text-gray-500'}`}>{h>0?`${Math.round(h/160*100)}%`:'-'}</td>)}
                        <td className="px-4 py-2"><button onClick={()=>setAsignaciones(as=>as.filter(x=>x.id!==a.id))} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button></td>
                      </tr>;
                    })
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showImport&&<ImportModal onClose={()=>setShowImport(false)} onImport={handleImport}/>}
    </div>
  );
}
