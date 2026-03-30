/**
 *@NApiVersion 2.x
 *@NAmdConfig /SuiteScripts/padron_config.json
 *@NScriptType Suitelet
 */
 define(["N/ui/serverWidget", "N/search", "N/task", "N/cache", "L54/utilidades", "N/runtime"],

 function (serverWidget, search, task, cache, util, runtime) {

     /**
      * Definition of the Suitelet script trigger point.
      *
      * @param {Object} context
      * @param {ServerRequest} context.request - Encapsulation of the incoming request
      * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
      * @Since 2015.2
      */
    var currentScript = runtime.getCurrentScript();
     function onRequest(context) {
         //log.audit("Suitlet Padron - Form Inicial", "Tipo de solicitud: " + context.request.method);
         try {

             var form = serverWidget.createForm({
                 title: "Cargar Padrón (Nuevo)"
             })
             
             form.clientScriptModulePath = "./L54 - Padron Carga (Cliente).js"

             form.addFieldGroup({
                 id: "filtros",
                 label: "Criterios Búsqueda Padrones"
             });

             form.addFieldGroup({
                 id: "proceso",
                 label: "Resultados"
             });

             form.addTab({
                 id: "tabpadron",
                 label: "Padrones"
             });

             form.addSubtab({
                 id: "tabpendiente",
                 label: "Pendiente",
                 tab: "tabpadron"
             });

             var tipo_padronfield = form.addField({
                 id: "custpage_padron",
                 label: "TIPO PADRÓN",
                 type: serverWidget.FieldType.SELECT,
                 source: "customrecord_l54_tipo_padron",
                 container: "filtros"
             });

             var OneWorldAcc = util.l54esOneworld();
             
             if(OneWorldAcc){
                 var subsidiaria_filter = form.addField({
                     id: "custpage_subsidiary",
                     label: "SUBSIDIARIA",
                     type: serverWidget.FieldType.MULTISELECT,
                     container:"filtros"
                 });
                 subsidiaria_filter.isMandatory = true;
                 addSubsidiaries(subsidiaria_filter);
            }
             

             var periodo_filter = form.addField({
                 id: "custpage_periodo",
                 label: "PERIODO",
                 type: serverWidget.FieldType.SELECT,
                 source: "accountingperiod",
                 container:"filtros"
             });

             var consultar_nuevos = form.addField({
                 id: "custpage_consulta_nuevos",
                 label: "Consultar Unicamente Nuevas Entidades",
                 type: serverWidget.FieldType.CHECKBOX,
                 container: "filtros"
             });                

             var tipo_consulta_padron = form.addField({
                 id: "custpage_tipo_consulta_padron",
                 label: "Se aplica al tipo",
                 type: serverWidget.FieldType.SELECT,
                 source: "customrecord_l54_tipo_consulta_padron",
                 container: "filtros",
             });                

             tipo_padronfield.isMandatory = true;
             tipo_consulta_padron.isMandatory = true;

             form.addSubmitButton({
                 label: "Generar"
             });
             
             /*
             form.addButton({
                 id: "custpage_sendform",
                 label: "Generar",
                 functionName: "generar()"
             });
             */
            

             var padronEmbargo = form.addField({
                 id: "custpage_padron_embargo",
                 label: "TIPO PADRÓN EMBARGO",
                 type: serverWidget.FieldType.SELECT,
                 source: "customrecord_l54_tipo_padron",
                 container: "filtros"
             });
            padronEmbargo.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
             var arbaEmbargo = currentScript.getParameter({ name: "custscript_l54_padron_carga_suitelet_arb" });
            
             if (!util.isEmpty(arbaEmbargo)) {
                 padronEmbargo.defaultValue = arbaEmbargo;
             }

            if (!util.isEmpty(context.request.parameters.custpage_padron)) {
                 tipo_padronfield.defaultValue = context.request.parameters.custpage_padron;
             }
             var taskfield = form.addField({
                 id: "custpage_taskid",
                 label: "Task ID",
                 type: serverWidget.FieldType.TEXT,
                 container: "filtros"
             }).updateDisplayType({
                 displayType: serverWidget.FieldDisplayType.HIDDEN
             });

             if (!util.isEmpty(context.request.parameters.custpage_taskid)) {
                 taskfield.defaultValue = context.request.parameters.custpage_taskid;
             }

             var sAccion = form.addField({
                 id: "custpage_accion",
                 label: "Acción",
                 type: serverWidget.FieldType.TEXT,
                 container: "filtros"
             }).updateDisplayType({
                 displayType: serverWidget.FieldDisplayType.HIDDEN
             });

             var infoResultado = form.addField({
                 id: "custpage_resultado",
                 label: "Resultados",
                 type: serverWidget.FieldType.INLINEHTML,
                 container: "proceso"
             });
             
             infoResultado.updateLayoutType({
                 layoutType: serverWidget.FieldLayoutType.MIDROW
             });
             
             infoResultado.padding = 50;

             // Se verifica si entrar por el método GET o POST
             if (context.request.method === "GET") {

                 context.response.writePage(form)
                 
             } else {
                 var sAccion = util.isEmpty(context.request.parameters.custpage_accion) ? context.request.parameters.submitter : context.request.parameters.custpage_accion;
                 //log.audit("Suitlet Padron - Form Inicial", "POST accion: " + sAccion);

                 switch (sAccion) {

                     case "STATUS":

                         form.addButton({
                             id: "custpage_status",
                             label: "Estatus",
                             functionName: "status()"
                         });

                         if (!util.isEmpty(context.request.parameters.custpage_taskid)) {

                             var html = consultarStatus(context.request.parameters.custpage_taskid);
                             infoResultado.defaultValue = html;
                         }

                         context.response.writePage(form);
                     break;

                     case "GENERAR":

                         log.audit("Suitlet Padron - Proceso Ppal", "Generación padron - INICIO Proceso: " + new Date());

                         if (util.isEmpty(context.request.parameters.custpage_taskid)) {

                             var html = "<font color=\"blue\">" + "Consultando registros de Padron..." + "</font><br><font>" + "(Por favor espere, ¡No cierre esta ventana!)" + "</font>";                               

                             var resultado = consultarPadrones(context.request, taskfield);

                             if(!util.isEmpty(resultado)){
                                 var mensaje = resultado.mensaje;

                                 if (resultado.error == true) {
                                     log.error("Suitlet Padron - Error", "Error en Generación de Padrón - Error : " + mensaje);
                                     var html = "<font color=\"red\">" + mensaje + "</font>";
                                 } else {
                                     var html = "<font>" + mensaje + "</font>";
                                 }
                                 log.audit("Suitlet Padron - Proceso Ppal", "RESPUESTA webservices: " + resultado.mensaje);
                                 //log.audit("RESPUESTA", "info padrones: " + resultado.info);
                             }
                             /*
                             if (!util.isEmpty(resultado.taskid)) {
                                 var html = consultarStatus(resultado.taskid);
                             }
                             */
                         } else {
                             var html = consultarStatus(context.request.parameters.custpage_taskid);
                         }
                         /*
                         form.addButton({
                             id: "custpage_status",
                             label: "Estatus",
                             functionName: "status()"
                         });
                         */
                         log.audit("Suitlet Padron - Proceso Ppal", "Generación padron - FIN Proceso: " + new Date());

                         infoResultado.defaultValue = html;

                         context.response.writePage(form);
                     break;
                 }
                     var sAccion = util.isEmpty(context.request.parameters.custpage_accion) ? context.request.parameters.submitter : context.request.parameters.custpage_accion;
                     //log.audit("POST accion: ", sAccion);
             }

         } catch (e) {
             log.error("Suitlet Padron - Error", "Error on Request: " + e.message);
         }
     }      

     function porProcesar(padronesPorEntidad, idPadron) {
         
         if(!util.isEmpty(padronesPorEntidad)){
             
             var arrayPadrones = padronesPorEntidad.split(",");

             if(arrayPadrones.indexOf(idPadron) >= 0) {
                 return false;
             }
         }

         return true;
     }        

     function consultarPadrones(request, field) {
         var objRespuesta = new Object();
         objRespuesta.error = false;
         objRespuesta.mensaje = "";
         objRespuesta.taskid = "";
            var arbaEmbargo = currentScript.getParameter({ name: "custscript_l54_padron_carga_suitelet_arb" });
            if(request.parameters.custpage_padron == arbaEmbargo){
                try {

                    // Preparar parámetros para Map/Reduce
                    var objParametros = {};
                    objParametros.custscript_l54_carga_padron_em_mr_pad = request.parameters.custpage_padron;
                    objParametros.custscript_l54_carga_padron_em_mr_per = request.parameters.custpage_periodo;
                    objParametros.custscript_l54_carga_padron_em_mr_cn = request.parameters.custpage_consulta_nuevos;
                    objParametros.custscript_l54_carga_padron_em_mr_tcp = request.parameters.custpage_tipo_consulta_padron;
                    objParametros.custscript_l54_carga_padron_em_mr_sub = request.parameters.custpage_subsidiary;
                    objParametros.custscript_l54_carga_padron_em_mr_email = runtime.getCurrentUser().id;

                    log.audit("MAP_REDUCE_PARAMS", "Parámetros enviados: " + JSON.stringify(objParametros));

                    // Crear y ejecutar Map/Reduce
                    var mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: "customscript_l54_carga_padron_em_mr", 
                        params: objParametros
                    });

                    var mrTaskId = mrTask.submit();
                    objRespuesta.taskid = mrTaskId;
                    objRespuesta.mensaje = "Proceso Map/Reduce iniciado correctamente.<br>" +
                                        "Recibirá notificación por email al finalizar.";

                    log.audit("MAP_REDUCE_SUBMITTED", "✅ Task ID: " + mrTaskId);
                    
                    return objRespuesta;

                } catch (e) {

                    log.error("Suitlet Padron - Error", "Error consultando Padrones: " + e.message);
                    objRespuesta.error = true;
                    objRespuesta.mensaje = "Error iniciando proceso: " + e.message;

                    return objRespuesta;
                }
            }else{
                try {

                    // Preparar parámetros para Map/Reduce
                    var objParametros = {};
                    objParametros.custscript_l54_carga_padrones_mr_pad = request.parameters.custpage_padron;
                    objParametros.custscript_l54_carga_padrones_mr_per = request.parameters.custpage_periodo;
                    objParametros.custscript_l54_carga_padrones_mr_cn = request.parameters.custpage_consulta_nuevos;
                    objParametros.custscript_l54_carga_padrones_mr_tcp = request.parameters.custpage_tipo_consulta_padron;
                    objParametros.custscript_l54_carga_padrones_mr_sub = request.parameters.custpage_subsidiary;
                    objParametros.custscript_l54_carga_padrones_mr_email = runtime.getCurrentUser().id;

                    log.audit("MAP_REDUCE_PARAMS", "Parámetros enviados: " + JSON.stringify(objParametros));

                    // Crear y ejecutar Map/Reduce
                    var mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: "customscript_l54_carga_padrones_mr", // Nuevo script ID
                        params: objParametros
                    });

                    var mrTaskId = mrTask.submit();
                    objRespuesta.taskid = mrTaskId;
                    objRespuesta.mensaje = "Proceso Map/Reduce iniciado correctamente.<br>" +
                                        "Recibirá notificación por email al finalizar.";

                    log.audit("MAP_REDUCE_SUBMITTED", "✅ Task ID: " + mrTaskId);
                    
                    return objRespuesta;

                } catch (e) {

                    log.error("Suitlet Padron - Error", "Error consultando Padrones: " + e.message);
                    objRespuesta.error = true;
                    objRespuesta.mensaje = "Error iniciando proceso: " + e.message;

                    return objRespuesta;
                }
            }
         
     }
     
     function consultarStatus(taskid) {
        var statusMap = task.checkStatus(taskid);
        var statusGeneral = statusMap.status;
        
        log.audit("MAP_REDUCE_STATUS", "📊 Estado: " + statusGeneral);

        var progressMessages = {
            'PENDING': '⏳ Preparando datos (getInputData)...',
            'PROCESSING': '🔄 Procesando en paralelo (map/reduce)...',
            'COMPLETE': '✅ Completado exitosamente',
            'FAILED': '❌ Error en procesamiento',
            'RETRY': '🔄 Reintentando automáticamente...',
            'CANCELLED': '⏹️ Cancelado'
        };

        var progressValues = {
            'PENDING': 1,
            'PROCESSING': 2,
            'COMPLETE': 4,
            'FAILED': 0,
            'RETRY': 2,
            'CANCELLED': 0
        };

        var mensaje = progressMessages[statusGeneral] || statusGeneral;
        var progreso = progressValues[statusGeneral] || 1;

        // HTML mejorado para Map/Reduce
        var html = "<div style='text-align: center; padding: 20px; font-family: Arial, sans-serif;'>";
        html += "<h3 style='color: #333; margin-bottom: 20px;'>🎯 Proceso Map/Reduce - Carga Padrón</h3>";
        html += "<div style='margin: 20px 0; font-size: 16px;'><strong>Estado: " + mensaje + "</strong></div>";
        
        // Barra de progreso mejorada
        html += "<div style='margin: 20px 0;'>";
        html += "<div style='background: #f0f0f0; border-radius: 10px; padding: 3px; width: 300px; margin: 0 auto;'>";
        html += "<div style='background: linear-gradient(90deg, #4CAF50, #45a049); height: 20px; border-radius: 8px; width: " + (progreso * 25) + "%; transition: width 0.3s ease;'></div>";
        html += "</div>";
        html += "<div style='font-size: 12px; color: #666; margin-top: 5px;'>Progreso: " + progreso + "/4 fases</div>";
        html += "</div>";

        // Información específica por estado
        if (statusMap.status === 'PENDING') {
            html += "<div style='background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #2196F3;'>";
            html += "<p><strong>📋 Preparando Datos:</strong></p>";
            html += "<p style='margin: 5px 0;'>• Obteniendo configuración y entidades</p>";
            html += "<p style='margin: 5px 0;'>• Dividiendo CUITs en lotes optimizados</p>";
            html += "<p style='margin: 5px 0;'>• Preparando eliminaciones necesarias</p>";
            html += "</div>";
        }

        if (statusMap.status === 'PROCESSING') {
            html += "<div style='background: #fff3e0; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #FF9800;'>";
            html += "<p><strong>⚡ Procesamiento Activo:</strong></p>";
            html += "<p style='margin: 5px 0;'>• Consultas a middleware en paralelo</p>";
            html += "<p style='margin: 5px 0;'>• Inserción de registros automática</p>";
            html += "<p style='margin: 5px 0;'>• Eliminaciones y actualizaciones</p>";
            html += "<p style='margin: 5px 0;'><em>💡 Sin límites de tiempo</em></p>";
            html += "</div>";
        }

        if (statusMap.status === 'COMPLETE') {
            html += "<div style='background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #4CAF50;'>";
            html += "<p style='color: #2e7d32;'><strong>🎉 ¡Proceso Completado Exitosamente!</strong></p>";
            html += "<p style='margin: 5px 0;'>✅ Todas las fases ejecutadas correctamente</p>";
            html += "<p style='margin: 5px 0;'>📧 Reporte detallado enviado por email</p>";
            html += "<p style='margin: 5px 0;'>💾 Datos disponibles en NetSuite</p>";
            html += "</div>";
        }

        if (statusMap.status === 'FAILED') {
            html += "<div style='background: #ffebee; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #f44336;'>";
            html += "<p style='color: #c62828;'><strong>❌ Error en el Proceso</strong></p>";
            html += "<p style='margin: 5px 0;'>📋 Revise los logs del script para detalles</p>";
            html += "<p style='margin: 5px 0;'>📧 Notificación de error enviada por email</p>";
            html += "<p style='margin: 5px 0;'>🔄 Puede reintentar el proceso</p>";
            html += "</div>";
        }

        // Información sobre ventajas del Map/Reduce
        html += "<div style='background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 14px;'>";
        html += "<p><strong>🚀 Ventajas del Map/Reduce:</strong></p>";
        html += "<div style='display: flex; justify-content: space-around; margin-top: 10px;'>";
        html += "<div style='text-align: center;'><strong>⏱️</strong><br>Sin límites<br>de tiempo</div>";
        html += "<div style='text-align: center;'><strong>🔄</strong><br>Procesamiento<br>paralelo</div>";
        html += "<div style='text-align: center;'><strong>🛡️</strong><br>Auto-recuperación<br>de errores</div>";
        html += "<div style='text-align: center;'><strong>📊</strong><br>Monitoreo<br>detallado</div>";
        html += "</div>";
        html += "</div>";

        html += "</div>";

        return html;
    }

     function createAndSubmitScheduledJob(idScript, parametros) {
         log.audit("createAndSubmitScheduledJob", "INICIO Invocacion Script Programado");
         var respuesta = new Object();
         respuesta.error = false;
         respuesta.mensaje = "";
         respuesta.estado = "";
         try {
             var mrTask = task.create({
                 taskType: task.TaskType.SCHEDULED_SCRIPT,
                 scriptId: idScript,
                 params: parametros
             });
             var mrTaskId = mrTask.submit();
             var taskStatus = task.checkStatus(mrTaskId);
             estado = taskStatus.status;
             if(estado == "PENDING"){
                 respuesta.mensaje="El proceso se está ejecutando, cuando se termine se le notificará al correo.";
             }else{
                 respuesta.mensaje = "El proceso esta en estado: "+estado;
             }
             //respuesta.mensaje = JSON.stringify(taskStatus);
         } catch (excepcion) {
             respuesta.error = true;
             respuesta.mensaje = "Excepcion Invocando el Script Programado - Excepcion : " + excepcion.message;
             log.error("createAndSubmitScheduledJob", respuesta.mensaje);
         }
         log.audit("createAndSubmitScheduledJob", "FIN Invocacion Script Programado");
         return respuesta;
     }

     function addSubsidiaries(select_sub){
        var search_sub = search.create({
        type: "subsidiary",
        filters: [
            ["country","anyof","AR"], "AND",
            ["isinactive", "is", "F"]
        ],
        columns:
            [
              search.createColumn({ name: "internalid", summary: "GROUP", sort: search.Sort.DESC, label: "Internal ID" }),
              search.createColumn({ name: "name", summary: "GROUP", label: "Name" })
            ]
        });
        var results = search_sub.run().getRange(0, 1000);
        var columns = search_sub.columns;
  
        if (results && results.length) {
            for (var i = 0; i < results.length; i++) {
                var id = results[i].getValue(columns[0]);
                var name = results[i].getValue(columns[1]);
                select_sub.addSelectOption({
                    value: id,
                    text: name
                });
            }
        }
      }

     return {
         onRequest: onRequest
     }
 });