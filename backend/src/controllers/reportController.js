const { pool } = require('../database/db');

/**
 * Calcula métricas de uptime, downtime e SLA para os dispositivos do cliente
 * GET /api/reports
 */
async function getUptimeReport(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    // Se for admin, aceita filtrar por um clientId específico enviado na query
    const clientIdFilter = isAdmin ? (req.query.clientId || null) : req.user.client_id;
    
    // Período em dias (padrão: 7 dias)
    const days = parseInt(req.query.days, 10) || 7;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // 1. Buscar todos os dispositivos associados
    let devicesQuery = `
      SELECT d.id, d.name, d.location, d.status as current_status, d.last_seen, d.created_at, c.name as client_name
      FROM devices d
      JOIN clients c ON d.client_id = c.id
      WHERE ($1::uuid IS NULL OR d.client_id = $1)
      ORDER BY d.name ASC
    `;
    const { rows: devices } = await pool.query(devicesQuery, [clientIdFilter]);

    if (devices.length === 0) {
      return res.json({
        summary: {
          totalDevices: 0,
          onlineDevices: 0,
          averageSla: 100,
          totalDisconnects: 0,
          totalUptimeHours: 0,
          totalDowntimeHours: 0
        },
        devices: [],
        incidents: []
      });
    }

    // 2. Buscar o histórico de status que se sobrepõe ao período
    const historyQuery = `
      SELECT h.device_id, h.status, h.started_at, h.ended_at
      FROM device_status_history h
      JOIN devices d ON h.device_id = d.id
      WHERE ($1::uuid IS NULL OR d.client_id = $1)
        AND h.started_at < $2
        AND (h.ended_at IS NULL OR h.ended_at > $3)
      ORDER BY h.started_at ASC
    `;
    const { rows: history } = await pool.query(historyQuery, [clientIdFilter, endDate, startDate]);

    // Agrupar histórico por dispositivo
    const historyByDevice = {};
    devices.forEach(d => {
      historyByDevice[d.id] = [];
    });
    history.forEach(row => {
      if (historyByDevice[row.device_id]) {
        historyByDevice[row.device_id].push(row);
      }
    });

    const processedDevices = [];
    let totalUptimeMs = 0;
    let totalDowntimeMs = 0;
    let grandTotalDisconnects = 0;
    const allIncidents = [];

    devices.forEach(device => {
      const deviceHistory = historyByDevice[device.id] || [];
      let uptimeMs = 0;
      let downtimeMs = 0;
      let disconnects = 0;
      let lastStatus = null;

      // Se não houver histórico registrado para o dispositivo neste intervalo de tempo,
      // assumimos o status atual dele para todo o período monitorado.
      if (deviceHistory.length === 0) {
        const deviceStartDate = Math.max(new Date(device.created_at).getTime(), startDate.getTime());
        const duration = endDate.getTime() - deviceStartDate;
        if (device.current_status === 'online') {
          uptimeMs = duration;
        } else {
          downtimeMs = duration;
        }
      } else {
        deviceHistory.forEach((segment, index) => {
          const startedAt = new Date(segment.started_at).getTime();
          const endedAt = segment.ended_at ? new Date(segment.ended_at).getTime() : endDate.getTime();

          // Calcula a interseção do segmento com o período solicitado [startDate, endDate]
          const overlapStart = Math.max(startedAt, startDate.getTime());
          const overlapEnd = Math.min(endedAt, endDate.getTime());
          const overlapDuration = Math.max(0, overlapEnd - overlapStart);

          if (segment.status === 'online') {
            uptimeMs += overlapDuration;
          } else {
            downtimeMs += overlapDuration;
          }

          // Detectar desconexões (transições de online para offline/error)
          if (lastStatus === 'online' && (segment.status === 'offline' || segment.status === 'error')) {
            disconnects++;
            // Registrar incidente
            allIncidents.push({
              deviceId: device.id,
              deviceName: device.name,
              clientName: device.client_name,
              startedAt: segment.started_at,
              endedAt: segment.ended_at || null,
              durationMs: segment.ended_at ? (new Date(segment.ended_at).getTime() - new Date(segment.started_at).getTime()) : null,
              status: segment.status
            });
          }

          lastStatus = segment.status;
        });

        // Caso a primeira entrada de status encontrada comece depois de startDate,
        // preenchemos o intervalo inicial com base no primeiro status do histórico
        const firstSegmentStartedAt = new Date(deviceHistory[0].started_at).getTime();
        const deviceStartDate = Math.max(new Date(device.created_at).getTime(), startDate.getTime());
        if (firstSegmentStartedAt > deviceStartDate) {
          const gapDuration = firstSegmentStartedAt - deviceStartDate;
          // Assumir o status anterior como o do primeiro registro
          if (deviceHistory[0].status === 'online') {
            uptimeMs += gapDuration;
          } else {
            downtimeMs += gapDuration;
          }
        }
      }

      const monitoredMs = uptimeMs + downtimeMs;
      const sla = monitoredMs > 0 ? (uptimeMs / monitoredMs) * 100 : (device.current_status === 'online' ? 100 : 0);

      totalUptimeMs += uptimeMs;
      totalDowntimeMs += downtimeMs;
      grandTotalDisconnects += disconnects;

      processedDevices.push({
        id: device.id,
        name: device.name,
        location: device.location,
        clientName: device.client_name,
        currentStatus: device.current_status,
        lastSeen: device.last_seen,
        uptimeMs,
        downtimeMs,
        disconnects,
        sla: parseFloat(sla.toFixed(2))
      });
    });

    // Calcular média geral do SLA
    const averageSla = processedDevices.length > 0
      ? processedDevices.reduce((acc, d) => acc + d.sla, 0) / processedDevices.length
      : 100;

    // Ordenar incidentes de forma decrescente por data de início
    allIncidents.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    // Limitar incidentes recentes exibidos a 30
    const recentIncidents = allIncidents.slice(0, 30);

    res.json({
      summary: {
        totalDevices: devices.length,
        onlineDevices: devices.filter(d => d.current_status === 'online').length,
        averageSla: parseFloat(averageSla.toFixed(2)),
        totalDisconnects: grandTotalDisconnects,
        totalUptimeHours: parseFloat((totalUptimeMs / (1000 * 60 * 60)).toFixed(1)),
        totalDowntimeHours: parseFloat((totalDowntimeMs / (1000 * 60 * 60)).toFixed(1))
      },
      devices: processedDevices,
      incidents: recentIncidents
    });

  } catch (err) {
    console.error('Erro ao gerar relatório de uptime:', err);
    res.status(500).json({ error: 'Erro interno ao gerar relatório' });
  }
}

module.exports = {
  getUptimeReport
};
