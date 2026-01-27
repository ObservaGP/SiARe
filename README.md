# 🧭 SiARe — Sistema de Acompanhamento de Relatórios  
### Monitoramento de Relatórios Técnicos e Administrativos de Projetos — **Versão 0.1 (27/01/2026)**

<p align="center">
  <img src="https://img.shields.io/badge/HTML-CSS--JS-blue?style=flat-square"/>
  <img src="https://img.shields.io/badge/Versão-0.1-orange?style=flat-square"/>
  <a href="https://creativecommons.org/licenses/by/4.0/">
    <img src="https://img.shields.io/badge/Licença-CC%20BY%204.0-lightgrey?style=flat-square"/>
  </a>
  <img src="https://img.shields.io/badge/Grupo-ObservaGP-brightgreen?style=flat-square"/>
</p>

---

## 🧩 Descrição Geral

O **SiARe — Sistema de Acompanhamento de Relatórios** é um sistema estático desenvolvido em **HTML, CSS e JavaScript** para organização, monitoramento e validação de **relatórios técnicos e administrativos** vinculados a projetos de pesquisa, desenvolvimento e inovação.

O sistema estrutura informações fundamentais do projeto — como **vigência**, **equipe executora** e **períodos de atuação** — e as consolida em uma **visualização matricial**, permitindo o acompanhamento de relatórios por **membro da equipe** e **mês de referência**.

O SiARe é voltado a contextos de **administração pública**, **pesquisa aplicada**, **gestão de projetos institucionais** e **prestação de contas**, sendo desenvolvido no âmbito do **Grupo de Pesquisa ObservaGP (IFES/UFES)**.

---

## ⚙️ Informações Técnicas

| Categoria | Detalhe |
|---------|--------|
| **Versão** | 0.1 — 27/01/2026 |
| **Tecnologias** | HTML, CSS, JavaScript |
| **Arquitetura** | Sistema estático orientado a dados estruturados |
| **Campo de Aplicação** | Administração Pública / Gestão de Projetos |
| **Grupo de Pesquisa** | ObservaGP — IFES / UFES |

---

## 👥 Autores

| Nome | Instituição | ORCID |
|------|------------|-------|
| **Victor Gianordoli** | Instituto Federal do Espírito Santo (IFES) | https://orcid.org/0000-0001-5905-0641 |
| **Taciana de Lemos Dias** | Universidade Federal do Espírito Santo (UFES) | https://orcid.org/0000-0002-7172-1230 |

---

## 🧠 Conceitos Estruturantes

O SiARe é organizado a partir de **três domínios principais**, com responsabilidades bem definidas:

### 🗂️ Administrativo
Responsável pelos **metadados do projeto**, incluindo:
- sigla e nome do projeto  
- códigos institucionais  
- vigência do acordo de parceria  
- definição de chave administrativa  

Esses dados constituem a **fonte de verdade** do sistema.

---

### 👥 Equipe Executora
Responsável pelo cadastro e manutenção das **pessoas vinculadas ao projeto**, incluindo:
- nome do integrante  
- tipo de vínculo (docente, discente, externo etc.)  
- função exercida  
- carga horária  
- período de atuação  

Os dados da equipe são utilizados diretamente na consolidação dos relatórios.

---

### 📊 Relatórios
Responsável pela **derivação e visualização** das informações, organizando:
- membros da equipe (linhas)  
- meses da vigência do projeto (colunas)  

Cada célula representa um **relatório mensal esperado**, permitindo o acompanhamento sistemático das entregas.

---

## 💻 Estrutura de Arquivos

Estrutura mínima recomendada do projeto:

```text
SiARe/
├─ index.html
├─ css/
│  └─ layout.css
├─ pages/
│  ├─ administrativo.html
│  ├─ equipe.html
│  └─ relatorios.html
├─ README.md
├─ CITATION.cff
└─ LICENSE
