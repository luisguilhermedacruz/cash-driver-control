# 🚕 Cash Driver Control

Aplicativo de controle financeiro e de desempenho para motoristas de aplicativo
(Uber, 99, InDriver), construído como projeto de portfólio em Análise e
Engenharia de Dados.

## O problema
Motoristas que rodam em vários aplicativos ao mesmo tempo não têm uma visão
única do próprio trabalho. Eu mesmo registrava tudo em planilhas que mudavam
de formato a cada mês, o que dificultava responder perguntas simples:
quanto ganho por hora? Qual dia rende mais? Quanto gasto com o carro?

## A solução
Um banco de dados central, alimentado por diferentes entradas, com análise
em dashboard.

- **Histórico (2024–2026):** ETL em Python que limpa e migra as planilhas antigas
- **Entrada diária:** Google Sheets → banco, via Apps Script
- **Entrada pelo celular:** web app com login por e-mail ou Google
- **Análise:** dashboard em Power BI

## Stack
Python (pandas) · PostgreSQL (Supabase) · Google Apps Script · Power BI · Figma

## Estrutura do repositório
| Pasta | Conteúdo |
|---|---|
| `etl/` | Scripts de extração, limpeza e carga |
| `sql/` | Criação das tabelas e regras de segurança |
| `sheets/` | Apps Script da planilha |
| `app/` | Web app |
| `docs/` | Métricas, regras de negócio e diagramas |

## Status
🚧 Em construção · Fase 0: organização do projeto