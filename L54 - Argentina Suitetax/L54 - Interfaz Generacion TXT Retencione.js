/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@NAmdConfig /SuiteScripts/configuration.json
 *@NModuleScope Public
 */

define(["N/search", "N/runtime", "N/log", "N/ui/serverWidget", "N/task", "N/url"],
  function (search, runtime, log, serverWidget, task, urlModule) {
    /* global define */
    /***
     * Migrado desde l54_Generar_TXT_Retenciones
     */
    const proceso = "formGeneracionTXT (SuiteLet)";
    // FUNCTION: isEmpty
    function isEmpty(value) {
      if (value === "" || value === null || value === "null" || value === undefined || value === "undefined") {
        return true;
      }
      return false;
    }


    // FUNCTION: esOneworld
    function esOneworld() {
      const filters = [];

      filters.push(search.createFilter({
        name: "custrecord_l54_es_oneworld",
        operator: search.Operator.IS,
        values: true
      })
      );

      const searchresults = search.create({
        type: "customrecord_l54_datos_impositivos_emp",
        filters: filters
      }).run().getRange({
        start: 0,
        end: 1000
      });

      if (searchresults != null && searchresults.length > 0)
        return true;
      else
        return false;
    }


    //formGeneracionTXT (SuiteLet)
    function onRequest(context) {

      const form = serverWidget.createForm({
        title: "Panel de generación de TXT de Retenciones y Percepciones"
      });

      log.debug({
        title: proceso,
        details: "INICIO Dibujando SuiteLet"
      });

      try {

        //Asociar a un Script de cliente ó JS en NS:
        form.clientScriptModulePath = "./L54 - Generar TXT.js";

        if (context.request.method === "GET") {
          const selectRegimen = form.addField({
            id: "custpage_field_tipo",
            label: "Régimen",
            type: serverWidget.FieldType.SELECT,
            container: "filtros",
            source: "customrecord_l54_tipos_txt" //????? */
          });

          selectRegimen.isMandatory = true;

          form.addField({
            id: "custpage_field_jurisdiccion",
            label: "Jurisdicción",
            type: serverWidget.FieldType.SELECT,
            container: "filtros",
            source: "customrecord_l54_zona_impuestos" //?????
          });


          const fechaDesde = form.addField({
            id: "custpage_field_fdesde",
            label: "Fecha Desde",
            type: serverWidget.FieldType.DATE,
            container: "filtros", //?????
            //source: 'Fecha Desde' //?????
          });
          fechaDesde.isMandatory = true;
          const fechaHasta = form.addField({
            id: "custpage_field_fhasta",
            label: "Fecha Hasta",
            type: serverWidget.FieldType.DATE,
            container: "filtros", //?????
            //source: 'Fecha Hasta'
          });
          fechaHasta.isMandatory = true;


          let oneWorld = false;
          if (esOneworld()) {
            oneWorld = true;
          }


          let campoSubsidiaria = null;
          if (oneWorld == true) {
            campoSubsidiaria = form.addField({
              id: "custpage_subsidiaria",
              label: "Subsidiaria",
              type: serverWidget.FieldType.SELECT,
              source: "subsidiary",
              container: "filtros"
            });
          } else {
            campoSubsidiaria = form.addField({
              id: "custpage_subsidiaria",
              label: "Subsidiaria",
              type: serverWidget.FieldType.TEXT
            });
            campoSubsidiaria.defaultValue = "";
            campoSubsidiaria.isDisplay = false;
          }
          //10
          if (oneWorld == true) {
            campoSubsidiaria.isMandatory = true;
          }

          const nuevaResolucion = form.addField({
            id: "custpage_check",
            label: "Nueva Resolucion",
            type: serverWidget.FieldType.CHECKBOX,
            container: "filtros", //?????
            //source: 'Fecha Hasta'
          });

          //Subsidiaria del Usuario por Defecto
          const userContext = runtime.getCurrentUser();

          if (oneWorld == true) {
            const subsidiariaUsuario = userContext.subsidiary;
            if (!isEmpty(subsidiariaUsuario)) {
              campoSubsidiaria.defaultValue = subsidiariaUsuario;
            }
          }


          const myInlineHtml = form.addField({
            id: "custpage_field_texto",
            label: "Mensaje",
            type: serverWidget.FieldType.INLINEHTML
          });
          myInlineHtml.defaultValue = "<html><body><h2><u>Nota:</u> Desde este Panel es posible generar los archivos TXT para la Importacion de Retenciones y Percepciones. Al finalizar la generación del TXT, usted recibira un email informándole.</h2></body></html>";
          myInlineHtml.updateBreakType({
            breakType: serverWidget.FieldBreakType.STARTCOL
          });

          form.addSubmitButton({
            label: "Generar TXT"
          });

          context.response.writePage(form);

        } else {
          /* serverWidget.createForm({
            title: "Panel de generación de TXT de Retenciones y Percepciones"
          }); */
          const subsidiaria = context.request.parameters.custpage_subsidiaria;
          let errorPanel = false;
          let errorSubsidiaria = false;
          let url = "";
          let oneWorld = false;
          //13
          if (esOneworld()) {
            oneWorld = true;
          }
          let mensaje = "Se envió a procesar exitosamente. Cuando el proceso termine, se le comunicará por email.";
          if (isEmpty(subsidiaria) && oneWorld == true) {
            errorSubsidiaria = true;
            mensaje = "Debe Ingresar una Subsidiaria";
          }
          //14
          // Verifico si esta realizada la Configuracion del Panel de Control de TXT
          if (errorSubsidiaria == false) {
            const filtroPanel = [];
            filtroPanel[0] = search.createFilter({
              name: "isinactive",
              operator: search.Operator.IS,
              values: false
            });
            if (!isEmpty(subsidiaria)) {
              //Retorna un search filter como object
              filtroPanel[1] = search.createFilter({
                name: "custrecord_l54_panel_conf_txt_ret_sub",
                operator: search.Operator.IS,
                values: subsidiaria
              });
            }
            const columnaPanel = [];
            //Creates a new search column as a search.Column object.
            columnaPanel[0] = search.createColumn({
              name: "internalid"
            });

            columnaPanel[1] = search.createColumn({
              name: "custrecord_l54_panel_conf_txt_ret_url"
            });
            columnaPanel[2] = search.createColumn({
              name: "custrecord_l54_panel_conf_txt_ret_id_log"
            });
            //une los filtros y columnas:
            //devuelve un search.search
            const resultadoPanel = search.create({
              type: "customrecord_l54_panel_conf_txt_ret",
              filters: filtroPanel,
              columns: columnaPanel,
              title: "resultado panel"
            }).run().getRange({
              start: 0,
              end: 1000
            });

            //15

            if (!isEmpty(resultadoPanel) && resultadoPanel.length > 0) {
              url = resultadoPanel[0].getValue({ name: "custrecord_l54_panel_conf_txt_ret_url" });
              const urlLog = resultadoPanel[0].getValue({ name: "custrecord_l54_panel_conf_txt_ret_id_log" });
              if (!isEmpty(url) && !isEmpty(urlLog))
                errorPanel = false;
              else
                errorPanel = true;
            } else
              errorPanel = true;

            if (errorPanel == true) {
              mensaje = "No se Encuentra Configurado el Panel de Configuración de TXT. Por Favor Realice la Configuración.";
            }
          }

          if (errorPanel == false) {
            var urlFinal = url;
            if (isEmpty(urlFinal)) {
              urlFinal = "https://system.na1.netsuite.com";
            }
            var fechaDesdeSeleccionada = context.request.parameters.custpage_field_fdesde;
            var fechaHastaSeleccionada = context.request.parameters.custpage_field_fhasta;
            var regimenSeleccionado = context.request.parameters.custpage_field_tipo;
            var nuevoRegimen = context.request.parameters.custpage_check;
            log.debug({
              title: "Proceso Generacion TXT Retenciones y Percepciones",
              details: `Regimen Seleccionado : ${regimenSeleccionado}`
            });
            var jurisdiccionSeleccionado = context.request.parameters.custpage_field_jurisdiccion;
            log.debug({
              title: "Proceso Generacion TXT Retenciones y Percepciones",
              details: `Jurisdiccion Seleccionado : ${jurisdiccionSeleccionado}`
            });
            // Obtengo el EMail del Usuario que Ejecuto el Proceso
            runtime.getCurrentSession();
            var email = runtime.getCurrentUser().id;
            log.debug({
              title: "Proceso Generacion TXT",
              details: `Email : ${email}`
            });

            // Obtengo el Tipo de Operacion
            var tipoOperacion = "";
            var codigoRegimen = "";
            var errorProceso = false;
            mensaje = "Se envió a procesar exitosamente. Cuando el proceso termine, se le comunicará por email.";
            /*if (isEmpty(periodoSeleccionado)) {
                        errorProceso = true;
                        mensaje = "Falta Seleccionar un Periodo";
                        }*/

            if (isEmpty(fechaDesdeSeleccionada)) {
              errorProceso = true;
              mensaje = "Falta Ingresar Fecha Desde";
            }

            if (isEmpty(fechaHastaSeleccionada)) {
              errorProceso = true;
              mensaje = "Falta Ingresar Fecha Hasta";
            }
          }
          //18: Error del proceso
          if (errorProceso == false && errorPanel == false) {
            if (!isEmpty(regimenSeleccionado)) {
              const filtroRegimen = [];
              filtroRegimen[0] = search.createFilter({
                name: "isinactive",
                operator: search.Operator.IS,
                values: false
              });
              filtroRegimen[1] = search.createFilter({
                name: "internalid",
                operator: search.Operator.IS,
                values: regimenSeleccionado
              });
              const columnaRegimen = [];
              columnaRegimen[0] = search.createColumn({
                name: "custrecord_l54_tipos_txt_codigo"
              });
              columnaRegimen[1] = search.createColumn({
                name: "custrecord_l54_tipos_txt_tipo"
              });
              columnaRegimen[2] = search.createColumn({
                name: "name"
              });
              const resultadoRegimen = search.create({
                type: "customrecord_l54_tipos_txt",
                filters: filtroRegimen,
                columns: columnaRegimen,
              }).run().getRange({
                start: 0,
                end: 1000
              });
              if (!isEmpty(resultadoRegimen) && resultadoRegimen.length > 0) {
                codigoRegimen = resultadoRegimen[0].getValue({ name: "custrecord_l54_tipos_txt_codigo" });
                tipoOperacion = resultadoRegimen[0].getValue({ name: "custrecord_l54_tipos_txt_tipo" });
                let nombreRegimen = resultadoRegimen[0].getValue({ name: "name" });
                if (isEmpty(nombreRegimen)) {
                  nombreRegimen = "";
                }
                if (isEmpty(codigoRegimen) || isEmpty(tipoOperacion)) {
                  errorProceso = true;
                  mensaje = `Falta Configurar Información Adicional para el Regimen ${nombreRegimen}`;
                }
              }
            } else {
              errorProceso = true;
              mensaje = "Falta Seleccionar un Regimen";
            }
          }

          try {
            const myInlineHtml = form.addField({
              id: "custpage_field_texto",
              label: "Mensaje",
              type: serverWidget.FieldType.INLINEHTML
            });
            myInlineHtml.defaultValue = `<html><body><h2> ${mensaje} </h2></body></html>`;

            if (!isEmpty(urlFinal)) {

              const direccion = form.addField({
                id: "enterempslink",
                label: " ",
                type: serverWidget.FieldType.URL
              }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
              });
              direccion.updateLayoutType({
                layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW
              });
              const urlDeployScript = urlModule.resolveScript({
                //idScript: planilla de componentes
                scriptId: "customscript_l54_inter_gen_txt_ret_sl_v2",
                //id implementación
                deploymentId: "customdeploy_l54_interfaz_gen_txt",
                returnExternalUrl: false
              });
              direccion.linkText = "Volver";
              direccion.defaultValue = urlDeployScript;
            }
          } catch (error) {

            log.error({
              title: proceso,
              details: `'Error NetSuite Excepción -  ${proceso}  - Detalles: ${error.message}`
            });
          }

          if (errorProceso == false) {
            const respuesta = {
              error: false,
              mensaje: "",
              estado: ""
            };

            // Llamo a Script Programado para Generar el TXT
            //params['custscript_l54_txt_periodo'] = periodoSeleccionado;
            try {
              const mrTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                params: {
                  "custscript_l54_txt_fdesde_v2": fechaDesdeSeleccionada,
                  "custscript_l54_txt_fhasta_v2": fechaHastaSeleccionada,
                  "custscript_l54_txt_regimen_v2": codigoRegimen,
                  "custscript_l54_txt_userEmail_v2": email,
                  "custscript_l54_txt_operacion_v2": tipoOperacion,
                  "custscript_l54_txt_subsidiaria_v2": subsidiaria,
                  "custscript_l54_txt_jurisdiccion_v2": jurisdiccionSeleccionado,
                  "custscript_l54_txt_check": nuevoRegimen
                },
                scriptId: "customscript_l54_genera_txt_retenc_pr_v2"
              });
              const taskMapId = mrTask.submit();
              const taskStatus = task.checkStatus(taskMapId);
              respuesta.estado = taskStatus;
            } catch (error) {
              respuesta.error = true;
              respuesta.mensaje = `Excepción invocando al script programado - Excepción: ${error.message}`;
              log.error(respuesta.mensaje);
            }

            log.debug(proceso, `406 - respuesta: ${JSON.stringify(respuesta)}`);
          }
        }
      } catch (excepcion) {
        log.error({
          title: proceso,
          details: `Excepcion : ${excepcion.message}`
        });
      }

      log.debug({
        title: proceso,
        details: "FIN Dibujando SuiteLet"
      });
      context.response.writePage(form);
    }
    return {
      onRequest: onRequest
    };
  }); 