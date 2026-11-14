#!/usr/bin/env bash
set -uo pipefail

VERBS='Adiciona|Corrige|Remove|Atualiza|Refatora|Renomeia|Move'
BRANCH_RE='^(feat|fix|chore)/[a-z0-9._-]+$'
JUNK_RE='(\.(bak|log|tmp|orig|rej|swp)$|(^|/)(\.DS_Store|Thumbs\.db|npm-debug\.log.*)$|~$)'
DEBUG_RE='^\+.*(console\.log\(|debugger;?|binding\.pry|var_dump\()'

BASE="origin/${BASE_REF}"
errors=0
fail() { echo "::error::$1"; errors=$((errors + 1)); }

# 1. Base e branch
[[ "$BASE_REF" == "main" ]] || fail "O PR deve apontar para a main (aponta para '$BASE_REF')."
[[ "$HEAD_REF" =~ $BRANCH_RE ]] || fail "Branch '$HEAD_REF' inválida. Usar feat/<nome>, fix/<nome> ou chore/<nome>."

# 2. Título
[[ "$PR_TITLE" =~ ^($VERBS)\  ]] || fail "Título deve começar com um verbo: ${VERBS//|/, }."
(( ${#PR_TITLE} <= 72 )) || fail "Título com ${#PR_TITLE} caracteres (máx. 72)."

# 3. Commits
while read -r sha; do
  [[ -z "$sha" ]] && continue
  subject=$(git show -s --format=%s "$sha")
  body=$(git show -s --format=%B "$sha")
  author=$(git show -s --format=%ae "$sha")
  short=${sha:0:7}

  [[ "$subject" =~ ^($VERBS)\  ]] || fail "Commit $short: deve começar com um verbo (${VERBS//|/, }) -> '$subject'"
  (( ${#subject} <= 72 )) || fail "Commit $short: assunto com ${#subject} caracteres (máx. 72)."
  grep -qiE 'co-authored-by|generated with|claude|anthropic' <<< "$body" \
    && fail "Commit $short: contém co-autor ou assinatura de IA."
  grep -qiE 'noreply@anthropic\.com' <<< "$author" \
    && fail "Commit $short: autor inválido ($author)."

  if [[ -n "${ALLOWED_EMAILS:-}" ]]; then
    grep -qiwF -f <(tr ',' '\n' <<< "$ALLOWED_EMAILS" | xargs -n1) <<< "$author" \
      || fail "Commit $short: autor '$author' não está na lista permitida."
  fi
done < <(git rev-list --no-merges "$BASE..$HEAD_SHA")

# 4. Descrição segue a ordem do template
prev=0
for h in "## Resumo" "## Alterações" "## Como testar" "## Checklist"; do
  line=$(grep -nF "$h" <<< "$PR_BODY" | head -1 | cut -d: -f1)
  if [[ -z "$line" ]]; then
    fail "Descrição sem a secção '$h'."
  elif (( line < prev )); then
    fail "Secção '$h' fora de ordem. Seguir o template."
  else
    prev=$line
  fi
done
grep -qF -- '- [ ]' <<< "$PR_BODY" && fail "Checklist com itens por marcar."

# 5. Lixo no repositório
while read -r f; do
  [[ -z "$f" ]] && continue
  [[ "$f" =~ $JUNK_RE ]] && fail "Ficheiro inútil adicionado: $f"
done < <(git diff --name-only --diff-filter=A "$BASE...$HEAD_SHA")

if git diff -U0 "$BASE...$HEAD_SHA" -- . ':!.github/scripts/pr-hygiene.sh' | grep -qE "$DEBUG_RE"; then
  fail "Código de debug adicionado (console.log, debugger, ...)."
fi

# Resultado
if (( errors > 0 )); then
  echo "PR Hygiene falhou com $errors problema(s)."
  exit 1
fi
echo "PR Hygiene OK."