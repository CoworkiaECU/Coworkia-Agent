// Etiquetas de servicio centralizadas
// Soporta camelCase, snake_case y variantes en español

const SERVICE_LABELS = {
  hotDesk: 'Hot Desk',
  hot_desk: 'Hot Desk',
  meetingRoom: 'Sala de Reuniones',
  meeting_room: 'Sala de Reuniones',
  salaReuniones: 'Sala de Reuniones',
  sala_reunion: 'Sala de Reuniones',
  deskIndividual: 'Escritorio Individual',
  privateOffice: 'Oficina Privada',
  private_office: 'Oficina Privada',
  oficina_privada: 'Oficina Privada',
  evento: 'Evento',
  coworking: 'Espacio Coworking',
};

export function getServiceLabel(type) {
  return SERVICE_LABELS[type] || 'Espacio';
}
