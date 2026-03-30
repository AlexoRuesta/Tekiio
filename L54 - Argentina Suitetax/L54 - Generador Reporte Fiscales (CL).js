/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(['N/currentRecord','N/url', 'N/format'], (currentRecord, url, format) => {

  function fieldChanged(ctx){
     const fieldsToRefresh = [
            'custpage_search',
            'custpage_subsidiaria',
            'custpage_fecha_desde',
            'custpage_fecha_hasta'
      ];

      if (!fieldsToRefresh.includes(ctx.fieldId)) return;

     const rec = currentRecord.get();

      const params = {
          custpage_search: rec.getValue({ fieldId: 'custpage_search' }) || '',
          custpage_subsidiaria: rec.getValue({ fieldId: 'custpage_subsidiaria' }) || '',
          custpage_fecha_desde: convertirFecha(rec.getValue({ fieldId: 'custpage_fecha_desde' })) || '',
          custpage_fecha_hasta: convertirFecha(rec.getValue({ fieldId: 'custpage_fecha_hasta' })) || ''
      };
    // const titulo     = rec.getValue({ fieldId:'custpage_titulo' }) || '';
    // const subsidiaria= rec.getValue({ fieldId:'custpage_subsidiaria' }) || '';
    // const autor      = rec.getValue({ fieldId:'custpage_autor' }) || '';

    // Resuelve la URL del mismo Suitelet y recarga con parámetros
    const suiteletUrl = url.resolveScript({
      scriptId: "customscript_l54_gen_rep_fis_sl",   // automáticamente el actual en 2.1? mejor hardcodear si hace falta
      deploymentId: "customdeploy_l54_gen_rep_fis_sl"
    });
    console.log("suiteletUrl", suiteletUrl)
    // Armar querystring manualmente para asegurar compatibilidad
    const qs = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v || '')}`)
      .join('&');

    const connector = suiteletUrl.includes('?') ? '&' : '?';
    // 🔑 Desactivar aviso antes de recargar
    window.onbeforeunload = null;
    window.location.href = suiteletUrl + connector + qs;
  }

  function convertirFecha(fecha) {
      if (!fecha) return '';
      try {
        // Convierte al formato interno ISO pero considerando la localización del usuario
        return format.format({
          value: fecha,
          type: format.Type.DATE
        });
      } catch (e) {
        console.error('Error convirtiendo fecha', e);
        return '';
      }
    }

  return { fieldChanged };
});