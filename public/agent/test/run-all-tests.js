/**
 * MASTER TEST RUNNER - FATU-R POS HARDWARE AGENT
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('========================================================');
console.log('    FATU-R HARDWARE AGENT - SUÍTE DE TESTES AUTOMATIZADOS');
console.log('========================================================\n');

const tests = [
  'test-escpos.js',
  'test-queue-sqlite.js',
  'test-pairing-wss.js',
  'test-tcp-raw.js'
];

let allPassed = true;

for (const testFile of tests) {
  const filePath = path.join(__dirname, testFile);
  try {
    console.log(`[EXECUTANDO] ${testFile}...`);
    execSync(`node "${filePath}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ FALHA NO TESTE: ${testFile}`);
    allPassed = false;
    break;
  }
}

console.log('========================================================');
if (allPassed) {
  console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
  console.log('========================================================');
  process.exit(0);
} else {
  console.error('❌ HOUVE FALHA EM UM OU MAIS TESTES.');
  console.log('========================================================');
  process.exit(1);
}
