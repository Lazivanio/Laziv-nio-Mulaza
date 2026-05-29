const Service = require('node-windows').Service;

// Criar objeto de serviço para o Fatu-R Agent
const svc = new Service({
  name: 'FatuRHardwareAgent',
  description: 'Fatu-R Enterprise POS Hardware & Printer Spooler Agent (Port 9100)',
  script: require('path').join(__dirname, 'index.js'),
  env: [
    {
      name: 'NODE_ENV',
      value: 'production'
    }
  ]
});

// Listener 'install'
svc.on('install', () => {
  console.log('Fatu-R POS Hardware Agent instalado com sucesso como Serviço do Windows Windows!');
  svc.start();
});

// Se o serviço já existir, avisa
svc.on('alreadyinstalled', () => {
  console.log('O serviço Fatu-R POS Agent já se encontra registado no sistema operacional.');
});

// Instalar
svc.install();
