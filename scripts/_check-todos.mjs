import https from 'https';
https.get('https://coworkia-agent-e97d15dac56f.herokuapp.com/api/todos', r => {
  let b = '';
  r.on('data', d => b += d);
  r.on('end', () => {
    const { todos } = JSON.parse(b);
    todos.filter(t => t.status !== 'done').forEach(t => {
      console.log(`#${t.id} [${t.status}] [${t.agent||'?'}] ${t.title}`);
      if (t.description) console.log(`   → ${t.description.slice(0,150)}`);
    });
  });
});
