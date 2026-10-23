import js from '@eslint/js'
export default [{
  files: ['supabase/functions/_shared/*.js', 'tests/*.js'],
  ...js.configs.recommended,
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
}]
