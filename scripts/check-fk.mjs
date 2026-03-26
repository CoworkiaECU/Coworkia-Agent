import fetch from 'node-fetch';

// Verificar si el usuario existe en la tabla users
console.log('🔍 Verificando FOREIGN KEY constraint...\n');

const checkUser = await fetch('https://coworkia-agent-e97d15dac56f.herokuapp.com/api/users?phone=%2B593994837117');
const userData = await checkUser.json();

console.log('Usuario en BD:', JSON.stringify(userData, null, 2));

// Intentar insertar directamente con un script de test
const testInsert = `
CREATE TABLE IF NOT EXISTS test_insurance (
  id TEXT PRIMARY KEY,
  quote_code TEXT UNIQUE,
  user_phone TEXT,
  status TEXT DEFAULT 'pending'
);

-- Este INSERT debería funcionar sin FOREIGN KEY
INSERT INTO test_insurance (id, quote_code, user_phone, status) 
VALUES ('TEST-001', 'VAZ-TEST', '+593994837117', 'quoted');

SELECT * FROM test_insurance WHERE id = 'TEST-001';
`;

console.log('\n📝 Script de prueba:');
console.log(testInsert);
