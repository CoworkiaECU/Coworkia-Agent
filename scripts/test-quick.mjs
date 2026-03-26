import fetch from 'node-fetch';

const payload = {
  vehicleData: {
    brand: 'Toyota',
    model: 'RAV4',
    year: 2024,
    type: 'suv',
    commercialValue: 48000
  },
  customerData: {
    nombres: 'Diego Villota Test',
    email: 'mktlab.ec@gmail.com',
    telefono: '+593994837117',
    cedula: '1714025432',
    edad: 35,
    provincia: 'Pichincha'
  },
  options: {
    quoteCode: `VAZ-TEST-${Date.now().toString(36).toUpperCase().slice(-8)}`,
    includeCompetitors: true
  }
};

console.log('📤 Generando cotización:', payload.options.quoteCode);

const response = await fetch('https://coworkia-agent-e97d15dac56f.herokuapp.com/api/adriana/send-quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const data = await response.json();
console.log('✅ Resultado:', JSON.stringify(data, null, 2));

// Verificar si se guardó en BD
setTimeout(async () => {
  const leads = await fetch('https://coworkia-agent-e97d15dac56f.herokuapp.com/api/adriana/leads?limit=3');
  const leadsData = await leads.json();
  console.log('\n📊 Leads en BD:', leadsData.count);
  if (leadsData.count > 0) {
    console.log('✅ LEAD GUARDADO EXITOSAMENTE');
    console.log('   Quote Code:', leadsData.data[0].quote_code);
    console.log('   ID:', leadsData.data[0].id);
  } else {
    console.log('❌ Lead no se guardó');
  }
}, 2000);
