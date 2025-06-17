/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType ScheduledScript
 * @NModuleScope Public
 */
define([
  "N/https",
  "N/http",
  "N/file",
  "N/xml",
  "N/task",
  "N/runtime",
  "N/format",
  "L54/utilidades",
  "N/email",
], function (https, http, file, xml, task, runtime, format, utilidades, email) {
  /* global define log */
  /**
   * Definition of the Scheduled script trigger point.
   *
   * @param {Object} scriptContext
   * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
   * @Since 2015.2
   */
  function execute(scriptContext) {
    const proceso = "execute - Tipo de Cambio BNA (Scheduled)";
    const error = false;
    let mensaje = "";

    try {
      log.debug(proceso, "INICIO - obtencion de TC en el BNA");

      //Retrieve array of objects
      const currentScript = runtime.getCurrentScript();
      const params = JSON.parse(
        currentScript.getParameter("custscript_l54_params_monedas")
      );
      log.debug(proceso, "params: " + JSON.stringify(params));

      if (utilidades.isEmpty(params)) {

          const config = obtenerConfiguracionBNA();
          let emailEmployee = "";
          let idEmployee = "";

          if (!config.error) {
            const urlservicio = config.config.urlservicio;
            const monedas = config.monedas;
            const consulta = consultarServicioBNA(urlservicio, monedas);
            const idCarpeta = config.config.idCarpeta;
            emailEmployee = config.config.emailEmployee;
            idEmployee = config.config.idEmployee;

            if (!consulta.error) {
              const monedasActualizar = consulta.monedasActualizar;
              log.debug(
                proceso,
                "monedasActualizar: " + JSON.stringify(monedasActualizar)
              );
              const update = actualizarMonedaNetsuite(monedasActualizar);
              if (update.error) {
                mensaje = update.mensaje;
                log.debug(proceso, "LINE 54 -  " + update.mensaje);
              } else if (!update.error && !utilidades.isEmpty(update.mensaje)) {
                mensaje = update.mensaje;
                log.debug(proceso, "LINE 57 - " + mensaje);
              }
            } else {
              mensaje = consulta.mensaje;
              log.error(proceso, "LINE 61 - " + mensaje);
            }
          } else {
            mensaje = config.mensaje;
            log.error(proceso, "LINE 65 - " + mensaje);
          }

          sendEmailEmployee(mensaje, idEmployee);

      } else {
        /*
         * ScheduledScript was excuted from a SuitletScript process.
         * Retrieve array of objects with currencies info
         */
        var monedasActualizar = params.monedasActualizar;
        const idCarpeta = params.idCarpeta;
        const idEmployee = params.idEmployee;

        if (monedasActualizar.length > 0) {
          const update = actualizarMonedaNetsuite(monedasActualizar);
          if (update.error) {
            mensaje = update.mensaje;
            log.debug(proceso, "LINE 94 -  " + update.mensaje);
          } else if (!update.error && !utilidades.isEmpty(update.mensaje)) {
            mensaje = update.mensaje;
            log.debug(proceso, "LINE 97 - " + mensaje);
          }

          sendEmailEmployee(mensaje, idEmployee);
        }
      }
      log.debug(proceso, "FIN - obtencion de TC en el BNA");
    } catch (e) {
      log.error(
        proceso,
        "Error NetSuite Excepcion - execute function - Detalles: " + e.message
      );
    }
  }

  /**
   * @param {string}   mensaje          Message to email
   * @param {integer}   idEmployee       Employee Email
   */
  function sendEmailEmployee(mensaje, idEmployee) {
    const proceso = "sendEmailEmployee";

    try {
      log.debug(
        proceso,
        "idEmployee: " + idEmployee + " - mensaje: " + mensaje
      );
      let mensajeBody = "Buen día estimado/a, esperamos que esté bien,\n \n A continuación le enviamos los resultados de la importación CSV en NetSuite de los tipos de cambios de las monedas según el BNA: \n \n";

      if (!utilidades.isEmpty(idEmployee)) {
        mensajeBody += mensaje + "\n";
        mensajeBody +=
          "Adicionalmente, se recomienda la revisión de la importación realizada y la verificación del correcto tipo de cambio en NetSuite según el BNA. \n \n";
        mensajeBody += "Que tenga felíz día, saludos cordiales, \n Tekiio.";

        email.send({
          author: idEmployee,
          recipients: idEmployee,
          subject: "LOC ARG - Actualización de Tipos de Cambio de Monedas en NetSuite según el BNA",
          body: mensajeBody,
        });

        log.debug(proceso, "Email enviado con exito, fin del proceso.");
      } else {
        log.error(
          proceso,
          "Error, no se encuentra configurado el email del empleado, por lo tanto no se enviará notificación al culminar el proceso."
        );
      }
    } catch (error) {
      log.error(
        proceso,
        "Error NetSuite Excepcion al enviar Email - sendEmailEmployee - Detalles: " +
        error.message
      );
    }
  }


  /**
   * @return {object}  return             An object with the following properties:
   * @return {array}   return.monedas     An array of objects with all available currencies for the service
   * @return {object}  return.config      An object containing the config (urlservicio)
   * @return {boolean} return.error       True on error
   * @return {string}  return.mensaje     An error message if there is any
   */
  function obtenerConfiguracionBNA() {
    const response = { error: false, mensaje: "" };
    const proceso = "obtenerConfiguracionBNA";

    try {
      // INICIO Consultar URL Servicio
      const objResultSet = utilidades.searchSavedPro(
        "customsearch_l54_config_tc_bna",
        null
      );

      if (objResultSet.error) {
        response.error = true;
        response.mensaje =
          "Ocurrió un error al consultar el SS de Configuracion de Tipos de Cambio BNA - Detalles: " +
          objResultSet.descripcion;
        return response;
      }

      const resultSet = objResultSet.objRsponseFunction.result;
      const resultSearch = objResultSet.objRsponseFunction.search;

      if (!utilidades.isEmpty(resultSet) && resultSet.length > 0) {
        const config = {
          urlservicio: "",
          monedaBase: "",
          idCarpeta: "",
          emailEmployee: "",
          idEmployee: "",
        };
        const codigosMonedas = [];

        for (let i = 0; !utilidades.isEmpty(resultSet) && i < resultSet.length; i++) {
          config.urlservicio = resultSet[i].getValue({
            name: resultSearch.columns[1],
          });
          config.monedaBase = resultSet[i].getValue({
            name: resultSearch.columns[2],
          });
          config.idCarpeta = resultSet[i].getValue({
            name: resultSearch.columns[6],
          });
          config.idEmployee = resultSet[i].getValue({
            name: resultSearch.columns[7],
          });
          config.emailEmployee = resultSet[i].getValue({
            name: resultSearch.columns[8],
          });

          const infoCodigoMoneda = {};
          infoCodigoMoneda.monedaBase = config.monedaBase;
          infoCodigoMoneda.idMonedaConsultarBNA = resultSet[i].getValue({
            name: resultSearch.columns[3],
          });
          infoCodigoMoneda.nombreTagHTML = resultSet[i].getValue({
            name: resultSearch.columns[4],
          });
          infoCodigoMoneda.consultarEnBNA = resultSet[i].getValue({
            name: resultSearch.columns[5],
          });
          infoCodigoMoneda.idContenedorHtml = resultSet[i].getValue({
            name: resultSearch.columns[9],
          });
          infoCodigoMoneda.aplicarInverso = resultSet[i].getValue({ 
            name: resultSearch.columns[10] 
          });
          infoCodigoMoneda.cotizacion = resultSet[i].getValue({
            name: resultSearch.columns[11],
          });
          codigosMonedas.push(infoCodigoMoneda);
        }

        if (utilidades.isEmpty(config.urlservicio)) {
          response.error = true;
          response.mensaje =
            "No se encuentra configurada la URL del Servicio de Consulta de Tipos de Cambio del BNA";
          return response;
        }

        log.debug(
          proceso,
          "URL Servicio Tipos de Cambios BNA: " +
          config.urlservicio +
          " - Moneda Base : " +
          config.monedaBase +
          " - codigosMonedas: " +
          JSON.stringify(codigosMonedas)
        );
        response.config = config;
        response.monedas = codigosMonedas;
      } else {
        response.error = true;
        response.mensaje =
          "No se encontraron registros de configuracion del servicio de consulta de Tipos de Cambios BNA.";
      }
    } catch (err) {
      response.error = true;
      response.mensaje = err.message;
    }
    return response;
  }

  /**
   * @param {string}   urlservicio    A hyperlink specifying the webservice
   * @param {array}    monedasConsultar    An array of objects with all available currencies for the service
   *
   * @return {object}  return         An object with the following properties
   * @return {boolean} return.error   True on error
   * @return {string}  return.mensaje An error message if there is any
   * @return {string}  return.monedasActualizar Array with the information of currenciees to update
   */
  function consultarServicioBNA(urlservicio, monedasConsultar) {
    const proceso = "consultarServicioBNA";
    const response = { error: false, mensaje: "", monedasActualizar: [] };

    log.audit(
      proceso,
      "Inicio - Consulta Servicio Tipos de Cambios BNA - URL : " +
      urlservicio +
      " - Monedas : " +
      JSON.stringify(monedasConsultar)
    );

    try {
      //Consulta tipos de cambios al servicio web
      let request = "";
      let errorHttp = false;
      let errorHttps = false;
      let mensajeErrorHttp = "";

      try {
        request = https.get({
          url: urlservicio,
        });
      } catch (error) {
        if (error.name == "SSS_INVALID_URL") {
          errorHttps = true;
        }
        mensajeErrorHttp =
          "Error al consultar por https al sitio web del BNA - Detalles: " +
          JSON.stringify(error);
        log.error(proceso, mensajeErrorHttp);
      }

      try {
        if (errorHttps) {
          request = http.get({
            url: urlservicio,
          });
        }
      } catch (error) {
        errorHttp = true;
        mensajeErrorHttp =
          "Error al consultar por http al sitio web del BNA - Detalles: " +
          JSON.stringify(error);
        log.error(proceso, mensajeErrorHttp);
      }

      if (!utilidades.isEmpty(request) && !errorHttp) {
        log.audit(
          proceso,
          "INICIO procesamiento de HTML por consulta Servicio Tipos de Cambios BNA"
        );
        let objResp = request.body;
        log.debug(proceso, "content html: " + JSON.stringify(objResp));
        objResp = objResp.replace(/(?:\r\n|\r|\n|\t)/g, "");

        if (!utilidades.isEmpty(objResp)) {
          /**
           * Como cada moneda puede solicitar informacion de una tabla distinta, hay que obtener todas las tablas, que haya por moneda.
           */
          const idDivs = [
            ...new Set(
              monedasConsultar.map((moneda) => moneda.idContenedorHtml)
            ),
          ];

          const datosFinales = idDivs.map((idDiv) => {
            const regex = new RegExp(
              `<div.*?id="${idDiv}".*?>[^]*?(<table .*?>[^]*?<\/table>)[^]*?<\/div>`
            );
            const match = regex.exec(objResp);
            const datos = match[1];
            if (utilidades.isEmpty(datos)) {
              log.debug(proceso, "no hay tabla con el ID: " + idDiv);
            }
            return { idContenedorHtml: idDiv, xmlString: datos };
          });

          if (!utilidades.isEmpty(datosFinales)) {
            const xmlRespuestas = datosFinales.map((o) => {
              const xmlRespuesta = xml.Parser.fromString({
                text: o.xmlString,
              });
              return {
                idContenedorHtml: o.idContenedorHtml,
                xml: xmlRespuesta,
              };
            });

            if (!utilidades.isEmpty(xmlRespuestas)) {
              const arrayXMLNodosTD = xmlRespuestas.map((objXml) => {
                const arrayNodosTD = xml.XPath.select({
                  node: objXml.xml,
                  xpath: "//*[name()='td']",
                });
                return {
                  idContenedorHtml: objXml.idContenedorHtml,
                  arrayNodosTD: arrayNodosTD,
                };
              });

              const noVacioCheck = arrayXMLNodosTD.every((arrayNodosTD) => {
                return (
                  !utilidades.isEmpty(arrayNodosTD.arrayNodosTD) &&
                  arrayNodosTD.arrayNodosTD.length > 0
                );
              });

              if (noVacioCheck) {
                log.debug(
                  proceso,
                  "arrayNodosTD: " + JSON.stringify(arrayXMLNodosTD)
                );

                const arrayXMLFinalTD = arrayXMLNodosTD.map((arrayNodos) => {
                  const arrayFinalTD = [];
                  arrayNodos.arrayNodosTD.forEach((element, index) => {
                    element.textContent = element.textContent.toUpperCase();
                    element.textContent = element.textContent.replace(
                      /(?:\r\n|\r|\n|\t)/g,
                      ""
                    );
                    element.textContent = element.textContent.replace(
                      /&nbsp/g,
                      " "
                    );
                    element.indice = index;
                    arrayFinalTD.push(element);
                  });
                  return {
                    idContenedorHtml: arrayNodos.idContenedorHtml,
                    arrayFinalTD: arrayFinalTD,
                  };
                });

                log.debug(
                  proceso,
                  "arrayFinalTD: " + JSON.stringify(arrayXMLFinalTD)
                );

                for (let i = 0; i < monedasConsultar.length; i++) {
                  monedasConsultar[i].errorConsultando = false;
                  monedasConsultar[i].mensajeError = "";

                  const arrayFinalTD = arrayXMLFinalTD.find(
                    (arrayFinalTD) => arrayFinalTD.idContenedorHtml ==
                      monedasConsultar[i].idContenedorHtml
                  ).arrayFinalTD;

                  const resultadoMoneda = arrayFinalTD.filter((obj) => {
                    return obj.textContent == monedasConsultar[i].nombreTagHTML;
                  });

                  log.debug(
                    proceso,
                    "resultadoMoneda: " + JSON.stringify(resultadoMoneda)
                  );

                  if (!utilidades.isEmpty(resultadoMoneda) &&
                    resultadoMoneda.length > 0) {
                    // se busca el tipo de cambio de venta del dolar en el BNA, este se ubica dos posiciones despues del TAG "Dolar U.S.A"
                    const indiceTCVenta = resultadoMoneda[0].indice + 2;
                    log.debug(
                      proceso,
                      "indice coincidencia moneda: " +
                      i +
                      " - indiceTCVenta: " +
                      indiceTCVenta +
                      " - arrayFinalTD.length: " +
                      arrayFinalTD.length
                    );

                    if (indiceTCVenta <= arrayFinalTD.length &&
                      !utilidades.isEmpty(arrayFinalTD[indiceTCVenta])) {
                      log.debug(
                        proceso,
                        "datosMonedaHtml: " +
                        JSON.stringify(arrayFinalTD[indiceTCVenta])
                      );
                      const tipoCambioVenta = arrayFinalTD[indiceTCVenta].textContent.replace(/,/g, ".");
                      log.debug(proceso, "tipoCambioVenta: " + tipoCambioVenta);
                      log.debug(proceso, "monedasConsultar[i].cotizacion: " + monedasConsultar[i].cotizacion);

                      if(!utilidades.isEmpty(monedasConsultar[i].cotizacion)){
                        tipoCambioVenta = tipoCambioVenta/monedasConsultar[i].cotizacion;
                        log.debug(proceso, "tipoCambioVenta Cotizacion:  " + tipoCambioVenta);
                      }

                      monedasConsultar[i].tipoCambioVenta = tipoCambioVenta;
                      response.monedasActualizar.push(monedasConsultar[i]);
                    } else {
                      monedasConsultar[i].errorConsultando = true;
                      monedasConsultar[i].mensajeError =
                        "No se puede acceder al tipo de cambio de venta de la moneda " +
                        monedasConsultar[i].nombreTagHTML +
                        ".";
                    }
                  } else {
                    monedasConsultar[i].errorConsultando = true;
                    monedasConsultar[i].mensajeError =
                      "No se encontró coincidencia de la solicitada moneda en el HTML, la moneda que no se pudo consultar es: " +
                      monedasConsultar[i].nombreTagHTML +
                      ".";
                  }
                }
              } else {
                response.error = true;
                response.mensaje =
                  "Ocurrió un error obteniendo NODO/TAGS de tipos de cambio del XML de respuesta del sitio web del BNA.";
              }
            } else {
              response.error = true;
              response.mensaje =
                "Ocurrió un error parseando HTML/XML de respuesta del sitio web del BNA.";
            }
          } else {
            response.error = true;
            response.mensaje =
              "Ocurrió un error Obteniendo respuesta del sitio web del BNA.";
          }
        } else {
          response.error = true;
          response.mensaje =
            "Ocurrió un error parseando respuesta del sitio web del BNA.";
        }
      } else {
        response.error = true;
        response.mensaje = "No se recibió respuesta del sitio web del BNA.";
      }

      return response;
    } catch (eSend) {
      response.error = true;
      response.code = 500;
      response.body =
        "Ocurrió una excepción Tratando de procesar información de tipo de cambio del BNA: " +
        eSend.message +
        ".";
      response.mensaje = response.body;
      return response;
    }
  }

  /**
   * @param {array} monedasActualizar An array of objects
   */
  function actualizarMonedaNetsuite(monedasActualizar) {
    const proceso = "actualizarMonedaNetsuite";
    log.debug(
      proceso,
      "Monedas a actualizar y moneda base: " + JSON.stringify(monedasActualizar)
    );
    const response = { error: false, mensaje: "" };

    try {
      //Set date value for today
      const fechaActualImportacion = format.format({
        value: obtenerFechaServidor("HOY"),
        type: format.Type.DATE,
      });

      // INICIO Actualizar Tipos de Cambio Moneda NetSuite
      let lineasCSV = "";
      let mensajeErrorCorreo = "";
      if (!utilidades.isEmpty(monedasActualizar) &&
        monedasActualizar.length > 0) {
        for (let i = 0; i < monedasActualizar.length; i++) {
          if (!monedasActualizar[i].errorConsultando) {
            lineasCSV = lineasCSV + monedasActualizar[i].monedaBase + ";" + fechaActualImportacion + ";" + monedasActualizar[i].tipoCambioVenta + ";" + monedasActualizar[i].idMonedaConsultarBNA + "\n";
          
            if(!utilidades.isEmpty(monedasActualizar[i].aplicarInverso) && (monedasActualizar[i].aplicarInverso == true || monedasActualizar[i].aplicarInverso == 'T')){
             
              var tipoCambioBase = 1 / parseFloat(monedasActualizar[i].tipoCambioVenta); 

              lineasCSV = lineasCSV +  monedasActualizar[i].idMonedaConsultarBNA + ";" + fechaActualImportacion + ";" + tipoCambioBase + ";" + monedasActualizar[i].monedaBase + "\n";
            }
          } else {
            mensajeErrorCorreo += monedasActualizar[i].mensajeError + "\n";
          }
        }
      }
      log.debug(proceso, "LINEA CSV : " + lineasCSV);

      if (!utilidades.isEmpty(lineasCSV)) {
        const fileCSV = file.create({
          name: "LOC ARG - Importacion Tipos de Cambio Monedas del BNA.csv",
          fileType: file.Type.CSV,
          contents: "Moneda Origen;Fecha;Tipo de Cambio;Moneda Destino\n" + lineasCSV,
        });

        fileCSV.folder = -15;
        const fileId = fileCSV.save();
        const fileObj = file.load({
          id: fileId,
        });

        // arreglar aca esto, buscar cponfiguracion del cust_imp y de las importaciones
        const respuesta = createAndSubmitCSVJob(
          "Actualizacion Tipo de Cambio segun el BNA",
          fileObj,
          "custimport_l54_act_tip_cambios"
        );

        if (!respuesta.error) {
          log.debug(proceso, "status: " + respuesta.estado);
          response.estado = respuesta.estado;

          if (response.estado == task.TaskStatus.FAILED) {
            response.error = true;
            mensajeErrorCorreo +=
              "La ejecución de la importación guardada falló, no se pudo actualizar el tipo de cambio de algunas monedas solicitadas. Por favor revise la importación guardada. \n";
            response.mensaje += mensajeErrorCorreo;
            return response;
          }

          response.mensaje +=
            "Le informamos que ha culminado el proceso encargado de guardar en NetSuite los tipos de cambios del BNA, para las monedas configuradas en el panel principal.\n";
          if (!utilidades.isEmpty(mensajeErrorCorreo)) {
            response.mensaje +=
              " Sin embargo, es importante destacar que, en el proceso se generaron ciertos errores para setear los tipos de cambios de algunas monedas, el detalle de los errores se muestran a continuación: " +
              mensajeErrorCorreo;
          }
        } else {
          // Ingresa a una excepcion y se debe mostrar en el correo a la misma, esta ocurre al intentar crear la importacion CSV
          response.error = true;
          mensajeErrorCorreo += respuesta.mensaje;
          response.mensaje = mensajeErrorCorreo;
        }
      } else if (!utilidades.isEmpty(mensajeErrorCorreo)) {
        response.error = true;
        response.mensaje = mensajeErrorCorreo;
      }
    } catch (e) {
      response.error = true;
      response.mensaje =
        "Ocurrió una excepcion al actualizar las monedas en NetSuite - Detalles: " +
        e.message;
    }
    return response;
  }

  function createAndSubmitCSVJob(name, file, importacion) {
    const proceso = "createAndSubmitCSVJob";
    log.audit(proceso, "INICIO Invocacion CSV");
    const response = { error: false, mensaje: "", estado: "" };

    try {
      const mrTask = task.create({
        taskType: task.TaskType.CSV_IMPORT,
        name: name,
        importFile: file,
        mappingId: importacion,
      });
      const mrTaskId = mrTask.submit();
      let taskStatus = task.checkStatus(mrTaskId);
      let statusGeneral = taskStatus.status;
      log.audit(proceso, "Estado de carga: " + statusGeneral);

      while (statusGeneral == task.TaskStatus.PROCESSING ||
        statusGeneral == task.TaskStatus.PENDING) {
        taskStatus = task.checkStatus(mrTaskId);
        statusGeneral = taskStatus.status;
      }

      log.debug(proceso, "statusGeneral", statusGeneral);
      response.estado = statusGeneral;
    } catch (excepcion) {
      response.error = true;
      response.mensaje =
        "Ocurrió una excepcion intentando realizar la importación CSV - Detalles Excepcion: " +
        excepcion.message;
    }
    log.audit(proceso, "FIN Invocacion CSV");

    return response;
  }

  /**
   * @param {string}   custom    Specify the required format date (HOY [date object]| AYER[string format] HACEXDIAS[string format])
   * @param {integer}  days      Specify the number of days to substract from today's date (only for HACEXDIAS)
   * @return {string}  return    HOY = A Date object | AYER = A string format | HACEXDIAS = A string format
   */
  function obtenerFechaServidor(custom, days) {
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const offset = -3; //TimeZone Montevideo - Argentina GMT -3:00
    const fechaActualArg = new Date(utc + 3600000 * offset);
    let diasRestar = "";
    let newDate = "";
    let formattedstring = "";

    if (!utilidades.isEmpty(fechaActualArg)) {
      switch (custom.toUpperCase()) {
        case "HOY":
          //Retornamos objecto Date con fecha actual de Argentina
          return fechaActualArg;
        case "AYER":
          diasRestar = 1; //restando 1 dia a la fecha actual
          newDate = new Date(
            fechaActualArg.setDate(fechaActualArg.getDate() - diasRestar)
          );
          formattedstring = formatearFecha(newDate);
          return formattedstring;
        case "HACEXDIAS":
          diasRestar = days; //restando 1 dia a la fecha actual
          newDate = new Date(
            fechaActualArg.setDate(fechaActualArg.getDate() - diasRestar)
          );
          formattedstring = formatearFecha(newDate);
          return formattedstring;
        default:
          return null;
      }
    } else {
      return null;
    }
  }

  function formatearFecha(fechaString) {
    if (!utilidades.isEmpty(fechaString)) {
      const f = new Date(fechaString);
      const formattedstring = f.getFullYear() +
        "-" +
        utilidades.padding_left(parseInt(f.getMonth(), 10) + 1, "0", 2) +
        "-" +
        utilidades.padding_left(f.getDate(), "0", 2);
      return formattedstring;
    } else {
      return null;
    }
  }

  Number.prototype.toFixedOK = function (decimals) {
    var sign = this >= 0 ? 1 : -1;
    return (
      Math.round(this * Math.pow(10, decimals) + sign * 0.001) /
      Math.pow(10, decimals)
    ).toFixed(decimals);
  };

  return {
    execute: execute,
  };
});