/* ===== SIDEBAR / NAV - idêntico ao Index ===== */
.sidebar-top{ text-align:center; }
.sidebar-top h1{ font-size:1.8rem; font-weight:800; margin:0; letter-spacing:.5px; color:#fff; }
.sidebar-top p{ font-size:.8rem; margin-top:.3rem; color:#e0e6ea; }

.sidebar-nav{ margin-top:2rem; display:flex; flex-direction:column; gap:.4rem; }
.sidebar-nav .nav-item{
  text-decoration:none; color:#fff; padding:.45rem .8rem;
  border-radius:6px; display:flex; align-items:center; gap:.6rem; font-size:.95rem;
  transition:background .2s; position:relative; background:transparent;
}
.sidebar-nav .nav-item:hover{ background:rgba(255,255,255,.15); }
.sidebar-nav .nav-item .icon{ width:1.2rem; text-align:center; }
.sidebar-nav .nav-item .label{ flex:1; }
.sidebar-nav .nav-item .chev{
  margin-left:.25rem; font-weight:700; opacity:.3;
  transform:translateX(0); will-change:transform,opacity;
}
.sidebar-nav .nav-item.active{
  background:#fff; color:var(--primary); font-weight:700; box-shadow:inset 0 0 0 2px var(--primary);
}
.sidebar-nav .nav-item.active .chev{
  color:var(--primary); opacity:1;
  animation:blinkArrow 1.5s infinite alternate ease-in-out;
}
@keyframes blinkArrow{
  0%{ opacity:.3; transform:translateX(0) }
  100%{ opacity:1; transform:translateX(5px) }
}

/* Rodapé da sidebar idêntico ao Index */
footer{ margin-top:auto; text-align:center; color:#e0e6ea; font-size:.8rem; display:flex; flex-direction:column; align-items:center; gap:.4rem; }
footer img{ height:22px; }
.footer-text{ margin:0; line-height:1.3; }
.footer-warning{ font-size:.7rem; color:#d0d8dc; max-width:230px; line-height:1.25; }

/* ===== CAMPOS ===== */
.field{ display:flex; align-items:center; gap:.6rem; margin:.5rem 0; }
.field label{ min-width:220px; font-weight:700; color:var(--primary); }
.field input{ flex:1; padding:.55rem .7rem; border-radius:8px; border:1px solid #c8d2da; font-size:1rem; background:#fff; }

/* ===== TABELA DOS BLOCOS ===== */
.table-wrapper{ background:#fff; border-radius:var(--radius); border:2px solid var(--primary); overflow:auto; }
.orgTable{ width:100%; border-collapse:separate; border-spacing:0; }
.orgTable thead th{
  position:sticky; top:0; background:#f5f8fa; color:#233D4D; z-index:1; font-weight:700; padding:.5rem .6rem; border-bottom:2px solid var(--primary);
}
.orgTable tbody td{ padding:.3rem; }

/* Célula com wrapper redimensionável HORIZONTAL + campo preenchendo */
.cell{
  width:100%;
  padding:0;
  border:1px solid var(--primary);
  border-radius:var(--radius);
  background:#fff;
}
.cell.resizable{
  resize: horizontal;           /* puxar para o lado */
  overflow:auto;
  min-width:140px;
  max-width:100%;
}
.cell > input,
.cell > textarea{
  width:100%;
  font: inherit;
  padding:.5rem .6rem;
  border:0;
  background:transparent;
  outline:none;
  display:block;
  box-sizing:border-box;
}

/* Textareas com resize VERTICAL + auto-grow */
.orgTable textarea[name="nome"],
.orgTable textarea[name="observacoes"],
.orgTable textarea[name="descricao"]{
  resize: vertical;              /* puxar para baixo */
  min-height:2.25rem;
  white-space:pre-wrap;
  overflow:auto;
}

/* Status coloridos sem bold extra */
.status-negative { color: var(--burgundy); font-weight: 400; }
.status-positive { color: var(--positive); font-weight: 400; }
