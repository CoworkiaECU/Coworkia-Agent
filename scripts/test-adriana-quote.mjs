import fetch from 'node-fetch';

const timestamp = Date.now().toString(36).toUpperCase().slice(-6);

const payload = {
  vehicleData: {
    brand: 'Chevrolet',
    model: 'Tracker',
    year: 2023,
    type: 'suv',
    commercialValue: 45000
  },
  customerData: {
    nombres: 'Diego Villota',
    email: 'mktlab.ec@gmail.com',
    telefono: '+593994837117',
    cedula: '1234567890',
    edad: 32,
    provincia: 'Pichincha'
  },
  options: {
    quoteCode: `VAZ-TEST-${timestamp}`,
    includeCompetitors: true
  }
};

console.log('📤 Generando cotización de prueba...');
console.log(`   Código: ${payload.options.quoteCode}`);
console.log(`   Vehículo: ${payload.vehicleData.brand} ${payload.vehicleData.model} ${payload.vehicleData.year}`);
console.log(`   Cliente: ${payload.customerData.nombres}`);
console.log('');

try {
  const response = await fetch('https://coworkia-agent-e97d15dac56f.herokuapp.com/api/adriana/send-quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (data.success) {
    console.log('✅ COTIZACIÓN GENERADA EXITOSAMENTE:');
    console.log(`   Código: ${data.quoteCode}`);
    console.log(`   Email enviado: ${data.emailSent ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Prima anual: $${data.annualPremium}`);
    console.log(`   Prima mensual: $${data.monthlyPremium}`);
    console.log('');
    console.log('📧 Revisa el email en: mktlab.ec@gmail.com');
    console.log('📊 Revisa el dashboard en: https://coworkia-agent-e97d15dac56f.herokuapp.com/adriana-seguros.html');
  } else {
    console.error('❌ ERROR EN LA COTIZACIÓN:');
    console.error(JSON.stringify(data, null, 2));
  }
} catch (error) {
  console.error('❌ Error de red:', error.message);
  process.exit(1);
}
