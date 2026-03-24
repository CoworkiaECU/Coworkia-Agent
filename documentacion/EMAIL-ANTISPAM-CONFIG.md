# 📧 Guía Anti-Spam — Configuración DNS para Emails Coworkia

**Fecha**: 24 Mar 2026  
**Estado**: Pendiente configuración DNS  
**Prioridad**: Alta — sin SPF+DKIM los emails pueden caer en spam incluso con HTML perfecto

---

## Resumen del Problema

El sistema envía emails desde Gmail SMTP con dominio `noreply@coworkia.com`.  
Si el registro SPF/DKIM del dominio `coworkia.com` no está configurado en DNS, **los servidores receptores (Gmail, Outlook, Yahoo) pueden marcar los emails como spam automáticamente**, sin importar el contenido.

---

## ✅ Cambios ya implementados en código (24 Mar 2026)

| Cambio | Archivo | Efecto |
|--------|---------|--------|
| `text/plain` auto-generado | `email.js` | +2 pts spam score (ausencia es flag rojo) |
| HTML minificado | `email.js` | Reduce tamaño ~30-50%, menos flags |
| SVGs inline eliminados | `email-ecosystem.js` | SVGs inline = señal de phishing para muchos filtros |
| `X-Mailer` + `X-Priority: 3` | `email.js` | Headers correctos identifican sender legítimo |
| TLS `rejectUnauthorized: true` | `mailer.js` | Conexión SMTP segura |

---

## 🔴 Pendiente: Configuración DNS

### 1. Registro SPF

**Qué es**: Autoriza a Gmail a enviar emails en nombre de `coworkia.com`.

**Dónde configurar**: Panel DNS del dominio `coworkia.com` (GoDaddy / Cloudflare / etc.)

**Registro a crear**:
```
Tipo: TXT
Nombre/Host: @  (o coworkia.com)
Valor: v=spf1 include:_spf.google.com ~all
TTL: 3600 (1 hora)
```

**Verificar**: `nslookup -type=TXT coworkia.com` o en [mxtoolbox.com/spf](https://mxtoolbox.com/spf.aspx)

---

### 2. Registro DKIM

**Qué es**: Firma criptográfica que prueba que el email no fue alterado en tránsito.

**Dónde generar**: Google Workspace Admin o, si se usa Gmail estándar + dominio personalizado, se configura en los ajustes de Gmail.

**Pasos**:
1. Ir a [admin.google.com](https://admin.google.com) → Aplicaciones → Google Workspace → Gmail → Autenticación de correo
2. Generar la clave DKIM para `coworkia.com`
3. Google te dará un registro TXT como este:
   ```
   Tipo: TXT
   Nombre/Host: google._domainkey.coworkia.com
   Valor: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3...{clave pública}
   ```
4. Agregarlo al DNS
5. Activar la firma DKIM en Google Admin

**Verificar**: [mxtoolbox.com/dkim](https://mxtoolbox.com/dkim.aspx) → dominio: `coworkia.com`, selector: `google`

---

### 3. Registro DMARC (recomendado)

**Qué es**: Política que indica a los receptores qué hacer con emails que fallen SPF o DKIM.

**Registro a crear**:
```
Tipo: TXT
Nombre/Host: _dmarc.coworkia.com
Valor: v=DMARC1; p=none; rua=mailto:admin@coworkia.com
TTL: 3600
```

**Nota**: `p=none` en modo monitor (no rechaza nada, solo reporta). Cuando todo esté funcionando, cambiar a `p=quarantine` o `p=reject`.

---

## 🔧 Verificación Completa

### Herramienta: mail-tester.com

1. Ir a [mail-tester.com](https://www.mail-tester.com/)
2. Copiar la dirección de test que te dan (ej: `test-abc123@mail-tester.com`)
3. Desde WhatsApp, escribir al bot y pedir una cotización/proforma para ese email
4. Volver a mail-tester.com y ver el análisis
5. **Objetivo**: score 8+/10

### Checklist DNS

```
[ ] SPF configurado  → nslookup -type=TXT coworkia.com | grep spf
[ ] DKIM activo      → mxtoolbox.com/dkim / selector: google
[ ] DMARC presente   → nslookup -type=TXT _dmarc.coworkia.com
[ ] From consistente → EMAIL_USER == EMAIL en Gmail (no mezclar dominios)
```

---

## ⚠️ Nota sobre el From actual

El sistema usa:
```
EMAIL_USER = [Gmail app password email]
EMAIL_FROM = Coworkia <noreply@coworkia.com>
```

**Si `EMAIL_USER` es `secretaria.coworkia@gmail.com` pero el `from` es `noreply@coworkia.com`**, hay inconsistencia. Gmail puede rechazar envíos donde el `from` no coincide con el usuario autenticado.

**Solución**: O usar `EMAIL_FROM = Coworkia <secretaria.coworkia@gmail.com>`, o migrar a Google Workspace con `noreply@coworkia.com` como cuenta real.

---

## 📊 Score esperado post-configuración

| Aspecto | Sin DNS config | Con SPF+DKIM+DMARC |
|---------|---------------|---------------------|
| text/plain | ✅ (ya implementado) | ✅ |
| SPF | ❌ | ✅ |
| DKIM | ❌ | ✅ |
| DMARC | ❌ | ✅ |
| SVGs inline | ✅ eliminados | ✅ |
| HTML pesado | ✅ minificado | ✅ |
| **Score estimado mail-tester** | **~5/10** | **~9/10** |

---

## Herramientas útiles

- [mail-tester.com](https://www.mail-tester.com/) — Test completo de spam score
- [mxtoolbox.com](https://mxtoolbox.com/) — Verificar SPF, DKIM, DMARC, blacklists
- [google.com/postmaster](https://postmaster.google.com/) — Panel de reputación del dominio ante Gmail
- [learndmarc.com](https://learndmarc.com/) — Visualizar flujo SPF/DKIM/DMARC
