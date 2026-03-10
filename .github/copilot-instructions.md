# Instrucciones para GitHub Copilot — Coworkia Agent

## 📧 Regla: Test de email tras cada cambio de template

**Cuando se modifique cualquier template de email** (archivos en `src/servicios/generic-email-templates.js`, `src/servicios/aluna-proforma-email.js`, `src/servicios/payment-receipt-email.js`, `src/servicios/email-templates-paula.js`, u otros archivos de template), **se debe enviar automáticamente un email de prueba** al finalizar los cambios:

```bash
node scripts/test-aluna-email.mjs yo@diegovillota.com plan20
```

- **Destinatario de prueba:** `yo@diegovillota.com`
- **Plan por defecto para tests:** `plan20`
- **Script de test:** `scripts/test-aluna-email.mjs`
- **Planes disponibles:** `plan10`, `plan20`, `oficinavirtual`, `salareuniones`

### Flujo de trabajo para cambios en templates de email:
1. Leer el template actual para entender el diseño existente
2. Aplicar los cambios de UI/diseño solicitados
3. Ejecutar el script de prueba: `node scripts/test-aluna-email.mjs yo@diegovillota.com plan20`
4. Confirmar al usuario que el email fue enviado con el código de proforma generado
5. Pedir feedback del usuario sobre el resultado visual

## 🏗️ Stack del proyecto

- **Runtime:** Node.js con ES Modules (`import/export`)
- **Email:** Gmail SMTP via `nodemailer` (servicio en `src/servicios/email.js`)
- **Base de datos:** PostgreSQL en Heroku
- **Agentes:** Aurora, Aluna, Enzo, Angela, Axel, Adriana, Gabi, Paula
- **HTML emails:** Inline CSS estricto (compatible con Gmail, Outlook)

## 🎨 Paleta de colores por agente

| Agente | Color primario | Color secundario |
|--------|---------------|-----------------|
| Aluna  | `#047857`     | `#065F46`       |
| Aurora | `#4ECDC4`     | `#2C9E96`       |
| Axel   | `#1E3A8A`     | `#1E40AF`       |
| Gabi   | `#7C3AED`     | `#6D28D9`       |
| Enzo   | `#DC2626`     | `#B91C1C`       |
| Paula  | `#D97706`     | `#B45309`       |
| Adriana| `#1E40AF`     | `#1E3A8A`       |
