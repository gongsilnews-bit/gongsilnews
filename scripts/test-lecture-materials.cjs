const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => name in mocks ? mocks[name] : require(name), process, Buffer, console, URL, Date, crypto: require('node:crypto').webcrypto });
  return module.exports;
}

(async () => {
  const { materialGroups } = load('src/types/lectureMaterial.ts');
  const materials = [
    { label: 'legacy common', url: 'https://example.com' },
    { label: 'chapter', scope: 'chapter', chapter_no: 2 },
    { label: 'lesson', scope: 'lesson', chapter_no: 2, lesson_no: 3 },
    { label: 'other lesson', scope: 'lesson', chapter_no: 2, lesson_no: 4 },
  ];
  assert.deepEqual(Array.from(materialGroups(materials, 2, 3), group => Array.from(group.items, item => item.label)), [['lesson'], ['legacy common']]);
  assert.equal(materialGroups(materials, 1, 1)[0].items.length, 0);

  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-material-key';
  const secrets = load('src/utils/lectureMaterialSecrets.ts', { 'server-only': {} });
  const sealed = secrets.sealMaterialUrl('https://example.com/worksheet');
  assert(!sealed.includes('example.com'));
  assert.equal(secrets.openMaterialUrl(sealed), 'https://example.com/worksheet');
  assert.throws(() => secrets.sealMaterialUrl('javascript:alert(1)'));
  const bytes = Buffer.from(sealed.slice(7), 'base64url'); bytes[15] ^= 1;
  assert.throws(() => secrets.openMaterialUrl('sealed:' + bytes.toString('base64url')));

  let user = null, role = '', enrollments = [];
  let lecture = { author_id: 'owner', status: 'ACTIVE', is_deleted: false, materials: [{ url: secrets.sealMaterialUrl('private:owner/file.pdf'), label: 'worksheet', is_preview: false }] };
  let signs = 0;
  const client = {
    from(table) {
      const result = () => ({ data: table === 'lectures' ? lecture : table === 'members' ? { role } : enrollments });
      const query = { select: () => query, eq: () => query, single: async () => result(), then: resolve => Promise.resolve(result()).then(resolve) };
      return query;
    },
    storage: { from: () => ({ createSignedUrl: async () => { signs++; return { data: { signedUrl: 'https://example.com/signed' } }; } }) },
  };
  const actions = load('src/app/actions/lectureMaterials.ts', {
    '@supabase/supabase-js': { createClient: () => client },
    '@/utils/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
    '@/utils/permissionCheck': { isAdminRole: role => role === 'ADMIN' },
    '@/utils/lectureMaterialSecrets': secrets,
  });
  const get = () => actions.getLectureMaterialUrl('lecture', 0);
  assert.equal((await get()).success, false); assert.equal(signs, 0);
  user = { id: 'student' };
  enrollments = [{ expires_at: '2000-01-01' }];
  assert.equal((await get()).success, false);
  enrollments = [{ expires_at: '2099-01-01' }];
  assert.equal((await get()).success, true);
  user = null; enrollments = []; lecture.materials[0].is_preview = true;
  assert.equal((await get()).success, true);
  lecture.status = 'DRAFT'; assert.equal((await get()).success, false);
  user = { id: 'owner' }; assert.equal((await get()).success, true);
  user = { id: 'admin' }; role = 'ADMIN'; assert.equal((await get()).success, true);
  assert.equal((await actions.getLectureMaterialUrl('lecture', -1)).success, false);
  if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  console.log('PASS: material scope, legacy materials, encryption, signed download authorization, expiry, preview, owner and admin');
})().catch(error => { console.error(error); process.exitCode = 1; });
