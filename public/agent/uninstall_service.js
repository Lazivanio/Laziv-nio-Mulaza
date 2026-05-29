const Service = require('node-windows').Service;

const svc = new Service({
  name: 'FatuRHardwareAgent',
  script: require('path').join(__dirname, 'index.js')
});

svc.on('uninstall', () => {
  console.log('Fatu-R POS Hardware Agent desinstalado com sucesso e removido do Windows.');
});

svc.uninstall();
