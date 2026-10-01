# Diretiva: Migração e Conexão com Supabase

## Objetivo
Estruturar o banco de dados PostgreSQL no Supabase, carregar o histórico de checklists e centralizar o módulo de atividades dos motoristas na nuvem.

## Passo 1: Execução do Schema
1. Acesse o dashboard do seu projeto no [Supabase](https://supabase.com).
2. Abra o menu **SQL Editor** na barra lateral esquerda.
3. Clique em **+ New query**.
4. Copie todo o conteúdo do arquivo [schema.sql](file:///c:/Users/ggsantos/Desktop/PROJETOS/Painel%20Checklist%20Frota/database/schema.sql), cole no editor e clique no botão verde **Run**.
5. Verifique no menu **Table Editor** se as tabelas foram criadas com sucesso:
   - `veiculos` (já com as 10 placas da frota)
   - `motoristas` (já com os 16 motoristas ativos)
   - `checklists`
   - `atividades_motoristas`
   - `ferias_motoristas`

## Passo 2: Obter as Chaves de Acesso
No Supabase:
1. Vá em **Project Settings** (ícone de engrenagem) > **API** (ou menu lateral **API Keys**).
2. Copie os dois valores:
   - **Project URL** (ex: `https://xyzproject.supabase.co`)
   - **Project API Keys** -> chave **anon / public**
3. Adicione esses valores no arquivo `.env`:
   ```env
   SUPABASE_URL=https://sua-url-aqui.supabase.co
   SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```

## Passo 3: Carga Inicial de Dados (Seed)
Executar o script determinístico:
```bash
node execution/seed_supabase.js
```
O script lê `src/data/checklist_data.csv`, formata e insere todo o histórico existente diretamente no Supabase.
