/**
* @NApiVersion 2.1
* @NAmdConfig /SuiteScripts/configuration.json
* @NScriptType Suitelet
* @NModuleScope Public
*/

define(["N/ui/serverWidget","L54/utilidades", "N/runtime", "N/search","N/task", "N/render", "N/record", "N/format"],

  function (serverWidget, utilities, runtime, search, task, render, record, format) {

    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
    */
    const FN = "Suitelet cargar Padron",
          RPT = { error: false, mensaje: "", result: []};

    var currentScript = runtime.getCurrentScript();
    const onRequest = (context) => {
      let suitelet = context.request.parameters.suitelet;
      log.debug("suitelet",suitelet )
      
      if(suitelet == null){
          main(context)
      }else{
          report[suitelet](context)
      }
    } 

    const main = (context) => {
      
    }

    const report = () => {}

    report.firstDay = function (context){
      log.debug("FirstDay")
      var objParametros = {};
      var arbaEmbargo = currentScript.getParameter({ name: "custscript_l54_st_ejecucion_padron_earba" });
      
      // objParametros.custscript_l54_scheduled_cargapadron_pad = context.request.parameters.custpage_padron;
      // objParametros.custscript_l54_scheduled_cargapadron_per = context.request.parameters.custpage_periodo;
      // objParametros.custscript_l54_scheduled_cargapadron_con = "F";
      // objParametros.custscript_l54_scheduled_cargapadron_tip = context.request.parameters.custpage_tipo_consulta_padron;
      // objParametros.custscript_l54_scheduled_cargapadron_sub = context.request.parameters.custpage_subsidiary;
      // objParametros.custscript_l54_scheduled_cargapadron_aut = true;
      // objParametros.custscript_l54_scheduled_cargapadron_ema = context.request.parameters.custpage_tipo_email;
      // objParametros.custscript_l54_scheduled_cargapadron_jur = context.request.parameters.custpage_jurisdiccion;


      objParametros.custscript_l54_carga_padrones_mr_pad = context.request.parameters.custpage_padron;
      objParametros.custscript_l54_carga_padrones_mr_per = context.request.parameters.custpage_periodo;
      objParametros.custscript_l54_carga_padrones_mr_cn = "F";
      objParametros.custscript_l54_carga_padrones_mr_tcp = context.request.parameters.custpage_tipo_consulta_padron;
      objParametros.custscript_l54_carga_padrones_mr_sub = context.request.parameters.custpage_subsidiary;
      objParametros.custscript_l54_carga_padrones_mr_aut = true;
      objParametros.custscript_l54_carga_padrones_mr_email = context.request.parameters.custpage_tipo_email;
      objParametros.custscript_l54_carga_padrones_mr_jur = context.request.parameters.custpage_jurisdiccion;
      log.audit("Proceso Programado", "objParametros a Enviar: " + JSON.stringify(objParametros));
      if(context.request.parameters.custpage_padron != arbaEmbargo){
        var objRespuesta = setScript("customscript_l54_carga_padrones_mr", objParametros);

        log.audit("Proceso Programado", "objRespuesta Recibido: " + JSON.stringify(objRespuesta));

      }
    }

    report.allDays = function (context) {
      var objParametros = {};
      var arbaEmbargo = currentScript.getParameter({ name: "custscript_l54_st_ejecucion_padron_earba" });
      // objParametros.custscript_l54_scheduled_cargapadron_pad = context.request.parameters.custpage_padron;
      // objParametros.custscript_l54_scheduled_cargapadron_per = context.request.parameters.custpage_periodo;
      // objParametros.custscript_l54_scheduled_cargapadron_con = "T";
      // objParametros.custscript_l54_scheduled_cargapadron_tip = context.request.parameters.custpage_tipo_consulta_padron;
      // objParametros.custscript_l54_scheduled_cargapadron_sub = context.request.parameters.custpage_subsidiary;
      // objParametros.custscript_l54_scheduled_cargapadron_aut = true;
      // objParametros.custscript_l54_scheduled_cargapadron_ema = context.request.parameters.custpage_tipo_email;
      // objParametros.custscript_l54_scheduled_cargapadron_jur = context.request.parameters.custpage_jurisdiccion;
      
      objParametros.custscript_l54_carga_padrones_mr_pad = context.request.parameters.custpage_padron;
      objParametros.custscript_l54_carga_padrones_mr_per = context.request.parameters.custpage_periodo;
      objParametros.custscript_l54_carga_padrones_mr_cn = "T";
      objParametros.custscript_l54_carga_padrones_mr_tcp = context.request.parameters.custpage_tipo_consulta_padron;
      objParametros.custscript_l54_carga_padrones_mr_sub = context.request.parameters.custpage_subsidiary;
      objParametros.custscript_l54_carga_padrones_mr_aut = true;
      objParametros.custscript_l54_carga_padrones_mr_email = context.request.parameters.custpage_tipo_email;
      objParametros.custscript_l54_carga_padrones_mr_jur = context.request.parameters.custpage_jurisdiccion;

      log.audit("Proceso Programado", "objParametros a Enviar: " + JSON.stringify(objParametros));
      if(context.request.parameters.custpage_padron != arbaEmbargo){
        var objRespuesta = setScript("customscript_l54_carga_padrones_mr", objParametros);

        log.audit("Proceso Programado", "objRespuesta Recibido: " + JSON.stringify(objRespuesta));

      }
    }

    const setScript = (idScript, parametros) => {
      
      var respuesta = new Object();
      respuesta.error = false;
      respuesta.mensaje = "";
      respuesta.estado = "";

      try {
          var script = task.create({
              taskType: task.TaskType.MAP_REDUCE,
              scriptId: idScript,
              params: parametros
          });
          var objScript = script.submit();
          var taskStatus = task.checkStatus(objScript);

          estado = taskStatus.status;
          
          if(estado == "PENDING"){
              respuesta.mensaje = "El proceso se está ejecutando, cuando se termine se le notificará al correo.";
          }else{
              respuesta.mensaje = "El proceso esta en estado: " + estado;
          }

          //respuesta.mensaje = JSON.stringify(taskStatus);
      } catch (excepcion) {
          respuesta.error = true;
          respuesta.mensaje = "Excepcion Invocando el Script Programado - Excepcion : " + excepcion.message;
          log.error("setScript", respuesta.mensaje);
      }
      log.audit("setScript", "FIN Invocacion Script Programado");
      return respuesta;
  }


    return {
      onRequest: onRequest
    };
});