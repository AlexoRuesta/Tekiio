/**
 * @NApiVersion 2.x
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType Suitelet
 * @NModuleScope Public
 */

/*require.config({
    paths: {
        '3K/utilities': './3K - Utilities'
    }
});*/

define(['N/ui/serverWidget', 'N/https', 'N/record', 'N/error', 'N/search', 'N/format', 'N/task', '3K/utilities', 'N/runtime'],

    function(serverWidget, https, record, error, search, format, task, utilities, runtime) {

        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context) {

            try {

                log.audit('Generación URU-Resguardo', 'INICIO - Metodo: ' + context.request.method);
                var currentScript = runtime.getCurrentScript();
                var habilitarFechaResguardo = currentScript.getParameter('custscript_l598_ge_u_re_sl_hab_fec_resg');
                var habilitarFechaEmisionResguardo = currentScript.getParameter('custscript_l598_ge_u_re_sl_hab_fec_em_re');
                var retencionLineas = currentScript.getParameter('custscript_l598_ge_u_re_sl_ret_lineas');
                retencionLineas = (!utilities.isEmpty(retencionLineas) && (retencionLineas == true || retencionLineas == 'T')) ? true : false;
                log.audit('Generación URU-Resguardo', 'Parámetros: Habilitar Fecha Resguardo: ' + habilitarFechaResguardo + ' - Habilitar Fecha Emisión Resguardo: ' + habilitarFechaEmisionResguardo + ' - retencionLineas: ' + retencionLineas);
                
                var esOneworld = utilities.l598esOneworld();

                var form = serverWidget.createForm({
                    title: 'Generación Transacción URU-Resguardo'
                });

                form.clientScriptModulePath = './L598 - Generacion URU-Resguardo (Cliente).js'

                var grupoFiltros = form.addFieldGroup({
                    id: 'filtros',
                    label: 'Criterios de Búsqueda General'
                });

                var grupoDatos = form.addFieldGroup({
                    id: 'infoNC',
                    label: 'Informacion'
                });

                var grupoFiltrosRet = form.addFieldGroup({
                    id: 'filtrosret',
                    label: 'Criterios de Búsqueda Por Retención'
                });

                var tabDetalle = form.addTab({
                    id: 'tabdetalle',
                    label: 'URU-Retenciones',
                });

                //INICIO - CAMPOS DE CABECERA
                var btnAccion = form.addField({
                    id: 'custpage_accion',
                    label: 'Accion:',
                    type: serverWidget.FieldType.TEXT,
                    container: 'filtros'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });

                //INICIO - FILTROS
                var periodoContable = form.addField({
                    id: 'periodocontable',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Periodo Contable:',
                    source: 'accountingperiod',
                    container: 'filtros'
                });

                if (esOneworld)
                {
                    var subsidiaria = form.addField({
                        id: 'subsidiaria',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Subsidiaria:',
                        source: 'subsidiary',
                        container: 'filtros'
                    });
                }
                else
                {
                    var subsidiaria = 0;
                }

                var proveedor = form.addField({
                    id: 'proveedor',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Proveedor:',
                    source: 'vendor',
                    container: 'filtros'
                });

                var codRetIRPF = form.addField({
                    id: 'codretirpf',
                    type: serverWidget.FieldType.MULTISELECT,
                    label: 'Código De Retención IRPF:',
                    container: 'filtrosret'
                });

                var codRetIRNR = form.addField({
                    id: 'codretirnr',
                    type: serverWidget.FieldType.MULTISELECT,
                    label: 'Código De Retención IRNR:',
                    container: 'filtrosret'
                });

                var codRetIRAE = form.addField({
                    id: 'codretirae',
                    type: serverWidget.FieldType.MULTISELECT,
                    label: 'Código De Retención IRAE:',
                    container: 'filtrosret'
                });

                var codRetIVA = form.addField({
                    id: 'codretiva',
                    type: serverWidget.FieldType.MULTISELECT,
                    label: 'Código De Retención IVA:',
                    container: 'filtrosret'
                });

                //FIN - FILTROS

/*                 var fechaServidor = new Date();

                var fechaLocal = format.format({
                    value: fechaServidor,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_MONTEVIDEO
                });

                var fechaLocalDate = format.parse({
                    value: fechaLocal,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_MONTEVIDEO
                }); */

                 var grupoDatosEmision = form.addFieldGroup({
                    id: 'datosemision',
                    label: 'Datos de Emisión Resguardo'
                });        
                
                 var fechaUruResguardo = form.addField({
                    id: 'fecharesguardo',
                    type: serverWidget.FieldType.DATE,
                    label: 'Fecha Resguardo:',
                    container: 'datosemision'                    
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                if (!utilities.isEmpty(habilitarFechaResguardo) && habilitarFechaResguardo)
                    fechaUruResguardo.updateDisplayType({ displayType: serverWidget.FieldDisplayType.NORMAL }); 

/*                 var fechaUruResguardoEmision = form.addField({
                    id: 'fecharesguardoemision',
                    type: serverWidget.FieldType.DATE,
                    label: 'Fecha Emisión Resguardo:',
                    container: 'datosemision'                    
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                if (!utilities.isEmpty(habilitarFechaEmisionResguardo) && habilitarFechaEmisionResguardo)
                    fechaUruResguardoEmision.updateDisplayType({ displayType: serverWidget.FieldDisplayType.NORMAL });

                if (!utilities.isEmpty(fechaUruResguardoEmision))
                    fechaUruResguardoEmision.defaultValue = fechaLocalDate;      */           

                if (esOneworld){
                    if(!utilities.isEmpty(context.request.parameters.subsidiaria)){
                        subsidiaria.defaultValue = context.request.parameters.subsidiaria;
                    }
                }

                if(!utilities.isEmpty(context.request.parameters.periodocontable)){
                    periodoContable.defaultValue = context.request.parameters.periodocontable;
                }

                 if(!utilities.isEmpty(context.request.parameters.fecharesguardo)){
                    fechaUruResguardo.defaultValue = context.request.parameters.fecharesguardo;
                } 
/* 
                if(!utilities.isEmpty(context.request.parameters.fecharesguardoemision)){
                    fechaUruResguardoEmision.defaultValue = context.request.parameters.fecharesguardoemision;
                } */

                if (!utilities.isEmpty(codRetIRPF)){
                    if(!utilities.isEmpty(context.request.parameters.codretirpf)){
                        codRetIRPF.defaultValue = context.request.parameters.codretirpf;
                    }
                }

                if (!utilities.isEmpty(codRetIRAE)){
                    if(!utilities.isEmpty(context.request.parameters.codretirae)){
                        codRetIRAE.defaultValue = context.request.parameters.codretirae;
                    }
                }

                if (!utilities.isEmpty(codRetIVA)){
                    if(!utilities.isEmpty(context.request.parameters.codretiva)){
                        codRetIVA.defaultValue = context.request.parameters.codretiva;
                    }
                }

                if (!utilities.isEmpty(codRetIRNR)){
                    if(!utilities.isEmpty(context.request.parameters.codretirnr)){
                        codRetIRNR.defaultValue = context.request.parameters.codretirnr;
                    }
                }

                if (!utilities.isEmpty(proveedor))
                {
                    if(!utilities.isEmpty(context.request.parameters.proveedor)){
                        proveedor.defaultValue = context.request.parameters.proveedor;
                    }
                }

                //INICIO - CAMPOS OBLIGATORIOS
                periodoContable.isMandatory = true;

                if (esOneworld)
                {
                    subsidiaria.isMandatory   = true;
                }
                //FIN - CAMPOS OBLIGATORIOS
                //FIN - CAMPOS DE CABECERA

                //INICIO - SUBLISTA NOTAS DE CREDITO
                var sublistRetenciones = form.addSublist({
                    id: 'retencionespendientes',
                    type: serverWidget.SublistType.LIST,
                    label: 'URU-Retenciones',
                    tab: 'tabdetalle'
                });

                sublistRetenciones.addField({
                    id: 'chkprocesar',
                    label: 'Exportar',
                    type: serverWidget.FieldType.CHECKBOX,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.NORMAL
                });

                sublistRetenciones.addField({
                    id: 'idinterno',
                    label: 'ID INTERNO',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistRetenciones.addField({
                    id: 'tranid',
                    label: 'REFERENCIA N.º',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistRetenciones.addField({
                    id: 'proveedor',
                    label: 'RAZON SOCIAL',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistRetenciones.addField({
                    id: 'ruc_proveedor',
                    label: 'NUMERO DE DOCUMENTO',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistRetenciones.addField({
                    id: 'fecha_emision',
                    label: 'FECHA DE EMISIÓN',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistRetenciones.addField({
                    id: 'periodo',
                    label: 'PERIODO',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistRetenciones.addField({
                    id: 'importe',
                    label: 'IMPORTE',
                    type: serverWidget.FieldType.CURRENCY,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });


                //INICIO - CARGA DE LOS VALORES DE LOS FILTROS POR CODIGO DE RETENCION
                var dataCodRetencion = search.load({
                    id: 'customsearch_l598_param_ret'
                });
                
                var resultSet = dataCodRetencion.run();
                var completeResultSet = null;
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set
                do
                {
                    resultado = resultSet.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!utilities.isEmpty(resultado) && resultado.length > 0)
                    {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }

                    // increase pointer
                    resultIndex = resultIndex + resultStep;
                    // once no records are returned we already got all of them
                } while (!utilities.isEmpty(resultado) && resultado.length > 0)

                if (!utilities.isEmpty(completeResultSet))
                {
                    var i = 0;

                    while (!utilities.isEmpty(completeResultSet) && completeResultSet.length > 0 && i < completeResultSet.length)
                    {
                        var idRec= completeResultSet[i].getValue({
                            name: resultSet.columns[0]
                        });

                        var nameRec = completeResultSet[i].getValue({
                            name: resultSet.columns[1]
                        });

                        var tipoRet = completeResultSet[i].getValue({
                            name: resultSet.columns[2]
                        });

                        if (tipoRet==1)//IRPF
                        {
                            codRetIRPF.addSelectOption({
                                value : idRec,
                                text : nameRec
                            });
                        }

                        if (tipoRet==2)//IRNR
                        {
                            codRetIRNR.addSelectOption({
                                value : idRec,
                                text : nameRec
                            });
                        }

                        if (tipoRet==3)//IVA
                        {
                            codRetIVA.addSelectOption({
                                value : idRec,
                                text : nameRec
                            });
                        }

                        if (tipoRet==4)//IRAE
                        {
                            codRetIRAE.addSelectOption({
                                value : idRec,
                                text : nameRec
                            });
                        }
                        i++;
                    }
                }
                //FIN - CARGA DE LOS VALORES DE LOS FILTROS POR CODIGO DE RETENCION

                sublistRetenciones.addMarkAllButtons();
                //FIN - SUBLISTA NOTAS DE CREDITO

                form.addSubmitButton({
                    label: 'Buscar Retenciones'
                });

                form.addButton({
                    id: 'custpage_btgenoc',
                    label: 'Generar',
                    functionName: "generarResguardo"
                });

                var infoResultado = form.addField({
                    id: 'custpage_resultado',
                    label: 'Resultados',
                    type: serverWidget.FieldType.INLINEHTML
                });


                if (context.request.method === 'GET') {
                    context.response.writePage(form);
                } else {
                    var sAccion = utilities.isEmpty(context.request.parameters.custpage_accion) ? context.request.parameters.submitter : context.request.parameters.custpage_accion;
                    //log.debug('Generación URU-Resguardo', 'LINE 248. sAccion : ' + sAccion);

                    switch (sAccion) {
                        case 'GENERARESGUARDO':
                            var statusMap = getStatusMap();
                            if (statusMap) {
                                var mensaje = "El proceso anterior aún no ha finalizado. Vuelva a intentarlo en unos minutos.";
                            } else {
                                var mensaje = "Se proceso su solicitud. Recibira una notificacion al finalizar por email";
                                //log.debug('Generación URU-Resguardo', 'context.request : ' + context.request+'. sublist: '+sublist);
                                var resultado = generarResguardoMapReduce(sublistRetenciones, context.request);
                                if (!utilities.isEmpty(resultado) && resultado.error == true) {
                                    mensaje = resultado.mensaje;
                                    log.error('Generación URU-Resguardo', 'Error Consulta Pagos Pendientes - Error : ' + mensaje);
                                }
                            }
                            infoResultado.defaultValue = '<font color="red">' + mensaje + '</font>';
                            log.audit('Generación URU-Resguardo', 'FIN Proceso');
                            context.response.writePage(form);
                            break;
                        case 'Buscar Retenciones':
                            var resultado = cargarRetenciones(sublistRetenciones,context.request,form/* ,fechaUruResguardo */,retencionLineas);
                            if (!utilities.isEmpty(resultado) && resultado.error == true) {
                                var mensaje = resultado.mensaje;
                                log.error('Generación URU-Resguardo', 'Error Consulta Pagos Pendientes - Error : ' + mensaje);
                                infoResultado.defaultValue = '<font color="red">' + mensaje + '</font>';
                            }
                            log.audit('Generación URU-Resguardo', 'FIN Proceso');
                            context.response.writePage(form);
                            break;
                    }
                }
            }
            catch (excepcion)
            {
                //log.error('Generación URU-Resguardo', 'Excepcion Proceso Generación URU-Resguardo - Excepcion : ' + excepcion.message);
                var mensajeError = 'Excepcion Proceso Generación URU-Resguardo';
                if (!utilities.isEmpty(excepcion) && !utilities.isEmpty(excepcion.message)) {
                    mensajeError = 'Excepcion Proceso Generación URU-Resguardo. Excepcion: '+ excepcion.message.toString();
                }
                log.error('Generacion URU-Resguardo', mensajeError);
            }
        }

        function getStatusMap(){
            let customSearch = search.create({
                type: "scheduledscriptinstance",
                filters:[
                            ["script.scriptid","is","customscript_l598_gen_uru_resguardo_mapr"], 
                            "AND", 
                            ["status","anyof","PENDING","PROCESSING"]
                        ],
                columns: [
                        search.createColumn({
                            name: "scriptid",
                            join: "scriptDeployment",
                            label: "Custom ID"
                        })
                        ]
            })
            
            let customResult = customSearch.run().getRange(0,1);
                
            if(customResult.length != 0) return true; else return false;
        } 

        function generarResguardoMapReduce(sublistRetenciones, request) {
            //log.audit('Generación URU-Resguardo', 'LINE 282. INICIO Consulta Pagos Pendientes. request.parameters.retencionespendientesdata: '+request.parameters.retencionespendientesdata+'. sublistRetenciones: '+sublistRetenciones+'. sublistCheques: '+sublistCheques);
            //log.debug('Generación URU-Resguardo', 'LINE 283. info a procesar:' + JSON.stringify(request.parameters));
            var arrayRETProcesar = new Array();
            var existenRETSeleccionadas = false;
            var respuesta = new Object();
            respuesta.error = false;
            respuesta.mensaje = "";
            respuesta.estado = "";
            try {
                if (!utilities.isEmpty(request.parameters.retencionespendientesdata)) {
                    var delimiterCampos = /\u0001/;
                    var delimiterArray = /\u0002/;
                    var fechaUruResguardo = '';
                    if(!utilities.isEmpty(request.parameters.fecharesguardo)){
                        fechaUruResguardo = format.parse({
                            value: request.parameters.fecharesguardo,
                            type: format.Type.DATE,
                        });
                    }
                    log.debug('fechaUruResguardo',fechaUruResguardo);
                    /* var fechaUruResguardoEmision = request.parameters.fecharesguardoemision;*/
                    //var idPeriodoContable = request.parameters.periodocontable;
                    var sublista = request.parameters.retencionespendientesdata.split(delimiterArray);

                    if ((!utilities.isEmpty(sublista) && sublista.length > 0)) {

                        //INICIO CICLO URU-RETENCION
                        if (!utilities.isEmpty(sublista) && sublista.length > 0){
                            for (var i = 0; respuesta.error == false && i < sublista.length; i++) {
                                if (!utilities.isEmpty(sublista[i])) {

                                    var columnas = sublista[i].split(delimiterCampos);

                                    if (!utilities.isEmpty(sublista) && sublista.length > 0) {

                                        var procesar = columnas[0];

                                        if (procesar == 'T')
                                        {
                                            existenRETSeleccionadas = true;
                                            var idInternoRET  = columnas[1];

                                            if(!utilities.isEmpty(idInternoRET))
                                            {
                                                arrayRETProcesar.push(idInternoRET);
                                            }
                                            else
                                            {
                                                respuesta.error = true;
                                                respuesta.mensaje = "No se pudo Obtener el ID Interno de la transacción URU-Retencion";
                                            }
                                        }
                                    }
                                    else
                                    {
                                        respuesta.error = true;
                                        respuesta.mensaje = "No se pudo obtener las columnas de la sublista de URU-Retencion";
                                    }
                                }
                                else
                                {
                                    //respuesta.error = true;
                                    respuesta.error = false;
                                    respuesta.mensaje = "No se pudo obtener el contenido de la sublista de URU-Retencion";
                                }
                            }
                        }
                        //FIN CICLO URU-RETENCION

                    	//log.debug('Generación URU-Resguardo','LINE 344. arrayRETProcesar: '+JSON.stringify(arrayRETProcesar));

                        if ((respuesta.error == false && existenRETSeleccionadas == false) || (respuesta.error == false &&  utilities.isEmpty(arrayRETProcesar))) {
                            respuesta.error = true;
                            respuesta.mensaje = "No se selecciono ninguna URU-Retencion para procesar";
                        }

                        if (respuesta.error == false)
                        {
                            //COMPONENTES PARA PROCESAMIENTO DE LOTES
                            var arrayRETProcesarFin =  new Array();
                            var contadorLote = 0;
                            var sizeLote = 1000;

                            for (var x=0; !utilities.isEmpty(arrayRETProcesar) && x < arrayRETProcesar.length; x++)
                            {
                                if (contadorLote < sizeLote)
                                {
                                    arrayRETProcesarFin.push(arrayRETProcesar[x]);
                                    contadorLote = contadorLote + 1;
                                    
                                    //SI SE ESTA PROCESANDO EL PRIMER Y UNICO REGISTRO SE MANDA A PROCESAR
                                    if ((x+1)==arrayRETProcesar.length)
                                    {
                                        log.debug('Generación URU-Resguardo', 'LINE 521 - CONTADORLOTE: '+contadorLote+' - INDICEPRINCIPAL: '+x+' - INDICE+1: '+(x+1)+' - ArrayLength: '+arrayRETProcesar.length+' - arrayRETProcesarFinLength: '+arrayRETProcesarFin.length);
                                        parametros = new Object();
                                        parametros.custscript_l598_gen_uru_resguardo_mapr_r    = arrayRETProcesarFin.toString();//ID URU-RETENCIONES
                                        parametros.custscript_l598_gen_uru_resguardo_mapr_f    = fechaUruResguardo;//FECHA URU-RESGUARDO A GENERAR
                                        /* parametros.custscript_l598_gen_uru_resguardo_mapr_g    = fechaUruResguardoEmision;//FECHA EMISION URU-RESGUARDO A GENERAR */
                                        log.debug('Generación URU-Resguardo', 'Generación URU-Resguardo - Parametros: ' + JSON.stringify(parametros));
                                        log.debug('Generación URU-Resguardo', 'INICIO llamada Script MAP/REDUCE');
                                        respuesta = createAndSubmitMapReduceJob('customscript_l598_gen_uru_resguardo_mapr', parametros);
                                        var mensajeEstado = "";
                                        if (!utilities.isEmpty(respuesta) && !utilities.isEmpty(respuesta.estado))
                                        {
                                            mensajeEstado = respuesta.estado.status;
                                        }
                                        log.audit('Generación URU-Resguardo', 'MAP/REDUCE - Estado : ' + mensajeEstado);
                                    }
                                }
                                else
                                {
                                    log.debug('Generación URU-Resguardo', 'LINE 539 - CONTADORLOTE: '+contadorLote+' - INDICEPRINCIPAL: '+x+' - INDICE+1: '+(x+1)+' - ArrayLength: '+arrayRETProcesar.length+' - arrayRETProcesarFinLength: '+arrayRETProcesarFin.length);
                                    //SE ENVIA EL PRIMERO LOTE A PROCESAR
                                    parametros = new Object();
                                    parametros.custscript_l598_gen_uru_resguardo_mapr_r    = arrayRETProcesarFin.toString();//ID URU-RETENCIONES
                                    parametros.custscript_l598_gen_uru_resguardo_mapr_f    = fechaUruResguardo;//FECHA URU-RESGUARDO A GENERAR
                                    /* parametros.custscript_l598_gen_uru_resguardo_mapr_g    = fechaUruResguardoEmision;//FECHA EMISION URU-RESGUARDO A GENERAR */
                                    log.debug('Generación URU-Resguardo', 'Generación URU-Resguardo - Parametros: ' + JSON.stringify(parametros));
                                    log.debug('Generación URU-Resguardo', 'INICIO llamada Script MAP/REDUCE');
                                    respuesta = createAndSubmitMapReduceJob('customscript_l598_gen_uru_resguardo_mapr', parametros);
                                    var mensajeEstado = "";
                                    if (!utilities.isEmpty(respuesta) && !utilities.isEmpty(respuesta.estado))
                                    {
                                        mensajeEstado = respuesta.estado.status;
                                    }
                                    log.audit('Generación URU-Resguardo', 'MAP/REDUCE - Estado : ' + mensajeEstado);

                                    //SE LIMPIAN LOS COMPONENTES PARA COMENZAR CON EL SIGUIENTE LOTE
                                    arrayRETProcesarFin =  new Array();
                                    contadorLote = 1;
                                    arrayRETProcesarFin.push(arrayRETProcesar[x]);

                                    //SI ES EL ULTIMO ELEMENTO DEL ARRAY SE MANDA A PROCESAR
                                    if ((x+1)==arrayRETProcesar.length)
                                    {
                                        log.debug('Generación URU-Resguardo', 'LINE 563 - CONTADORLOTE: '+contadorLote+' - INDICEPRINCIPAL: '+x+' - INDICE+1: '+(x+1)+' - ArrayLength: '+arrayRETProcesar.length+' - arrayRETProcesarFinLength: '+arrayRETProcesarFin.length);
                                        parametros = new Object();
                                        parametros.custscript_l598_gen_uru_resguardo_mapr_r    = arrayRETProcesarFin.toString();//ID URU-RETENCIONES
                                        parametros.custscript_l598_gen_uru_resguardo_mapr_f    = fechaUruResguardo;//FECHA URU-RESGUARDO A GENERAR
                                        /* parametros.custscript_l598_gen_uru_resguardo_mapr_g    = fechaUruResguardoEmision;//FECHA EMISION URU-RESGUARDO A GENERAR */
                                        log.debug('Generación URU-Resguardo', 'Generación URU-Resguardo - Parametros: ' + JSON.stringify(parametros));
                                        log.debug('Generación URU-Resguardo', 'INICIO llamada Script MAP/REDUCE');
                                        respuesta = createAndSubmitMapReduceJob('customscript_l598_gen_uru_resguardo_mapr', parametros);
                                        var mensajeEstado = "";
                                        if (!utilities.isEmpty(respuesta) && !utilities.isEmpty(respuesta.estado))
                                        {
                                            mensajeEstado = respuesta.estado.status;
                                        }
                                        log.audit('Generación URU-Resguardo', 'MAP/REDUCE - Estado : ' + mensajeEstado);
                                    }
                                }
                            }
                        }
                    } else {
                        respuesta.error = true;
                        respuesta.mensaje = "No se pudo obtener registros de la sublista de URU-Retenciones";
                    }
                } else {
                    respuesta.error = true;
                    respuesta.mensaje = "No se pudo obtener sublista de sublista de URU-Retenciones";
                }

            } catch (excepcion)
            {
                //log.error('Generación URU-Resguardo', 'Consulta Pagos Pendientes - Excepcion Consultando Pagos Pendientes - Excepcion : ' + excepcion.message);
                var mensajeError = 'Excepcion Consultando Pagos Pendientes';
                if (!utilities.isEmpty(excepcion) && !utilities.isEmpty(excepcion.message))
                {
                    mensajeError = 'Excepcion Consultando Pagos Pendientes. Excepcion: '+ excepcion.message.toString();
                }
                log.error('Generacion URU-Resguardo', mensajeError);
                respuesta.error = true;
                respuesta.mensaje = mensajeError;
            }
            log.audit('Generación URU-Resguardo', 'FIN Consulta Pagos Pendientes');
            return respuesta;
        }

        function cargarRetenciones(sublistRetenciones, request, form/* , fechaUruResguardo */, retencionLineas) {

            log.debug('Generación URU-Resguardo', 'INICIO Consulta URU-Retenciones sin URU-Resguardo');
            var respuesta = new Object();
            respuesta.error = false;
            respuesta.mensaje = "";

            try {

                var separadorMultiSelect = /\u0005/;
                var esOneworld = utilities.l598esOneworld();

                var uruRetencionesPendientes = search.load({
                    id: 'customsearch_l598_retencion_resguardo'
                });

                if (!utilities.isEmpty(request.parameters.periodocontable) && request.parameters.periodocontable.length > 0)
                {
                    var periodocontable = request.parameters.periodocontable;
                    var filtroPeriodo = search.createFilter({
                        name: 'postingperiod',
                        operator: search.Operator.IS,
                        values: periodocontable
                    });
                    uruRetencionesPendientes.filters.push(filtroPeriodo);
                }

                if (esOneworld){
                    if (!utilities.isEmpty(request.parameters.subsidiaria) && request.parameters.subsidiaria.length > 0) {
                        var subsidiaria = request.parameters.subsidiaria;
                            var filtroSubsidiaria = search.createFilter({
                                name: 'subsidiary',
                                operator: search.Operator.IS,
                                values: subsidiaria
                            });
                            uruRetencionesPendientes.filters.push(filtroSubsidiaria);
                    }
                }
/* 
                if (!utilities.isEmpty(request.parameters.periodocontable) && request.parameters.periodocontable.length > 0)
                {
                    var idPeriodo = request.parameters.periodocontable;
                    var endDatePeriodoLookUp = search.lookupFields({
                        type: 'accountingperiod',
                        id: idPeriodo,
                        columns: ['enddate']
                    });
                    //log.debug('LINE 526','request.parameters.fecharesguardo: '+request.parameters.fecharesguardo+' - endDatePeriodoLookUp.enddate: '+endDatePeriodoLookUp.enddate);
                    if (!utilities.isEmpty(endDatePeriodoLookUp))
                        request.parameters.fecharesguardo = endDatePeriodoLookUp.enddate;

                        //log.debug('LINE 526','request.parameters.fecharesguardo: '+request.parameters.fecharesguardo+' - form: '+JSON.stringify(form)+' - fechaUruResguardo: '+JSON.stringify(fechaUruResguardo));

                        fechaUruResguardo.defaultValue = endDatePeriodoLookUp.enddate;
                } */   

                if (!utilities.isEmpty(request.parameters.codretirpf) && request.parameters.codretirpf.length > 0 && request.parameters.codretirpf != 0)
                {
                    var codretirpf = new Array();
                    codretirpf = request.parameters.codretirpf.toString().split(separadorMultiSelect);
                    log.debug('Generación URU-Resguardo','CodRetIRPF: '+ JSON.stringify(codretirpf));
                    
                    if (!retencionLineas) {
                        var filtroirpf = search.createFilter({
                            name: 'custbody_l598_codigo_ret_irpf',
                            operator: search.Operator.ANYOF,
                            values: codretirpf
                        });
                    } else {
                        var filtroirpf = search.createFilter({
                            name: 'custcol_l598_codigo_ret_irpf',
                            join: 'custbody_l598_transaccion_origen_reten',
                            operator: search.Operator.ANYOF,
                            values: codretirpf
                        });
                    }

                    uruRetencionesPendientes.filters.push(filtroirpf);
                }

                if (!utilities.isEmpty(request.parameters.codretirnr) && request.parameters.codretirnr.length > 0 && request.parameters.codretirnr != 0)
                {
                    var codretirnr = new Array();
                    codretirnr = request.parameters.codretirnr.toString().split(separadorMultiSelect);
                    log.debug('Generación URU-Resguardo','CodRetIRNR: '+ JSON.stringify(codretirnr));
                    
                    if (!retencionLineas) {
                        var filtroirnr = search.createFilter({
                            name: 'custbody_l598_codigo_ret_irnr',
                            operator: search.Operator.ANYOF,
                            values: codretirnr
                        });
                    } else {
                        var filtroirnr = search.createFilter({
                            name: 'custcol_l598_codigo_ret_irnr',
                            join: 'custbody_l598_transaccion_origen_reten',
                            operator: search.Operator.ANYOF,
                            values: codretirnr
                        });
                    }
                    
                    uruRetencionesPendientes.filters.push(filtroirnr);
                }

                if (!utilities.isEmpty(request.parameters.codretirae) && request.parameters.codretirae.length > 0 && request.parameters.codretirae != 0)
                {
                    var codretirae = new Array();
                    codretirae = request.parameters.codretirae.toString().split(separadorMultiSelect);
                    log.debug('Generación URU-Resguardo','CodRetIRAE: '+ JSON.stringify(codretirae));

                    if (!retencionLineas) {
                        var filtroirae = search.createFilter({
                            name: 'custbody_l598_codigo_ret_irae',
                            operator: search.Operator.ANYOF,
                            values: codretirae
                        });
                    } else {
                        var filtroirae = search.createFilter({
                            name: 'custcol_l598_codigo_ret_irae',
                            join: 'custbody_l598_transaccion_origen_reten',
                            operator: search.Operator.ANYOF,
                            values: codretirae
                        });
                    }
                    
                    uruRetencionesPendientes.filters.push(filtroirae);
                }

                if (!utilities.isEmpty(request.parameters.codretiva) && request.parameters.codretiva.length > 0 && request.parameters.codretiva != 0)
                {
                    var codretiva = new Array();
                    codretiva = request.parameters.codretiva.toString().split(separadorMultiSelect);
                    log.debug('Generación URU-Resguardo','CodRetIVA: '+ JSON.stringify(codretiva));
                    
                    if (!retencionLineas) {
                        var filtroiva = search.createFilter({
                            name: 'custbody_l598_codigo_ret_iva',
                            operator: search.Operator.ANYOF,
                            values: codretiva
                        });
                    } else {
                        var filtroiva = search.createFilter({
                            name: 'custcol_l598_codigo_ret_iva',
                            join: 'custbody_l598_transaccion_origen_reten',
                            operator: search.Operator.ANYOF,
                            values: codretiva
                        });
                    }
                    
                    uruRetencionesPendientes.filters.push(filtroiva);
                }

                if (!utilities.isEmpty(request.parameters.proveedor) && request.parameters.proveedor.length > 0)
                {
                    var proveedor = request.parameters.proveedor;
                    log.debug('Generación URU-Resguardo','IdProveedor: '+ proveedor);
                    var filtroProveedor = search.createFilter({
                        name: 'custbody_l598_resguardo_proveedor',
                        operator: search.Operator.IS,
                        values: proveedor
                    });
                    uruRetencionesPendientes.filters.push(filtroProveedor);
                }

                var resultsNotasCreditoPend = uruRetencionesPendientes.run();
                var completeResultSetNotasCreditoPend = null;
                //log.debug('Generación URU-Resguardo', 'LINE 452. INICIO Consulta Busqueda Pagos Pendientes');

                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultadoNotasCreditoPend; // temporary variable used to store the result set
                do {
                    // fetch one result set
                    resultadoNotasCreditoPend = resultsNotasCreditoPend.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!utilities.isEmpty(resultadoNotasCreditoPend) && resultadoNotasCreditoPend.length > 0) {
                        if (resultIndex == 0)
                            completeResultSetNotasCreditoPend = resultadoNotasCreditoPend;
                        else
                            completeResultSetNotasCreditoPend = completeResultSetNotasCreditoPend.concat(resultadoNotasCreditoPend);
                    }

                    // increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!utilities.isEmpty(resultadoNotasCreditoPend) && resultadoNotasCreditoPend.length > 0)



                var idInternosTotal =[];

                //INICIO - SI SE HALLO INFORMACION de sublista de URU-Retenciones (VENDORCREDIT) SE LLENA LA SUBLISTA
                if (!utilities.isEmpty(completeResultSetNotasCreditoPend)) {

                    log.debug('Generación URU-Resguardo', 'Cantidad de URU-Retenciones sin URU-Resguardo: ' + completeResultSetNotasCreditoPend.length);
                    var idUnicoAnterior = 0;
                    var idInternos = new Array();
                    var idInternos2 = new Array();
                    var i = 0;

                    while (!utilities.isEmpty(completeResultSetNotasCreditoPend) && completeResultSetNotasCreditoPend.length > 0 && i < completeResultSetNotasCreditoPend.length){

                        var internalId = completeResultSetNotasCreditoPend[i].getValue({
                            name: resultsNotasCreditoPend.columns[0]
                        });

                        var tranId = completeResultSetNotasCreditoPend[i].getValue({
                            name: resultsNotasCreditoPend.columns[1]
                        });

                        var nombreProveedor = completeResultSetNotasCreditoPend[i].getValue({
                            name: resultsNotasCreditoPend.columns[2]
                        });

                        var ruc_proveedor = completeResultSetNotasCreditoPend[i].getValue({
                            name: resultsNotasCreditoPend.columns[3]
                        });

                        var fecha_emision = completeResultSetNotasCreditoPend[i].getValue({
                            name: resultsNotasCreditoPend.columns[4]
                        });

                        var periodo = completeResultSetNotasCreditoPend[i].getValue({
                            name: resultsNotasCreditoPend.columns[5]
                        });

                        var importe = completeResultSetNotasCreditoPend[i].getValue({
                            name: resultsNotasCreditoPend.columns[6]
                        });
        
                        if (!utilities.isEmpty(internalId) && internalId.length>0) {
                            sublistRetenciones.setSublistValue({
                                id: 'idinterno',
                                line: i,
                                value: internalId
                            });
                        }

                        if (!utilities.isEmpty(tranId) && tranId.length>0) {
                            sublistRetenciones.setSublistValue({
                                id: 'tranid',
                                line: i,
                                value: tranId
                            });
                        }                        

                        if (!utilities.isEmpty(nombreProveedor) && nombreProveedor.length>0) {
                            sublistRetenciones.setSublistValue({
                                id: 'proveedor',
                                line: i,
                                value: nombreProveedor
                            });
                        }

                        if (!utilities.isEmpty(ruc_proveedor) && ruc_proveedor.length>0) {
                            sublistRetenciones.setSublistValue({
                                id: 'ruc_proveedor',
                                line: i,
                                value: ruc_proveedor
                            });
                        }

                        if (!utilities.isEmpty(fecha_emision) && fecha_emision.length>0) {
                            sublistRetenciones.setSublistValue({
                                id: 'fecha_emision',
                                line: i,
                                value: fecha_emision
                            });
                        }

                        if (!utilities.isEmpty(periodo) && periodo.length>0) {
                            sublistRetenciones.setSublistValue({
                                id: 'periodo',
                                line: i,
                                value: periodo
                            });
                        }

                        if (!utilities.isEmpty(importe) && importe.length>0) {
                            sublistRetenciones.setSublistValue({
                                id: 'importe',
                                line: i,
                                value: importe
                            });
                        }
                        i++;
                    }
                }
                else {
                    //respuesta.error = true;
                    respuesta.mensaje = "No se encontraron Pagos Pendientes";
                    log.audit('Generación URU-Resguardo', 'FIN Consulta URU-Retenciones sin URU-Resguardo - No se encontraron Consulta URU-Retenciones');
                }
				//FIN - SI SE HALLO INFORMACION de sublista de URU-Retenciones SE LLENA LA SUBLISTA

            } catch (excepcion)
            {
                var mensajeError = 'Consulta URU-Retenciones sin URU-Resguardo - Excepcion Consultando Pagos';
                if (!utilities.isEmpty(excepcion) && !utilities.isEmpty(excepcion.message))
                {
                    mensajeError = 'Consulta URU-Retenciones sin URU-Resguardo - Excepcion Consultando Pagos. Excepcion: '+ excepcion.message.toString();
                }
                log.error('Generacion URU-Resguardo', mensajeError);

                respuesta.error = true;
                respuesta.mensaje = mensajeError;
                //log.error('Generación URU-Resguardo', 'Consulta URU-Retenciones sin URU-Resguardo - Excepcion Consultando Pagos - Excepcion : ' + excepcion.message);
            }

            log.debug('Generación URU-Resguardo', 'FIN Consulta URU-Retenciones sin URU-Resguardo');
            return respuesta;
        }

        function createAndSubmitMapReduceJob(idScript, parametros) {
            log.audit('Generación URU-Resguardo', 'INICIO Invocacion Script MAP/REDUCE');
            var respuesta = new Object();
            respuesta.error = false;
            respuesta.mensaje = "";
            respuesta.estado = "";
            try {
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: idScript,
                    params: parametros
                });
                var mrTaskId = mrTask.submit();
                var taskStatus = task.checkStatus(mrTaskId);
                respuesta.estado = taskStatus;
            } catch (excepcion) {
                var mensajeError = 'Excepcion Invocando A Script MAP/REDUCE';
                if (!utilities.isEmpty(excepcion) && !utilities.isEmpty(excepcion.message))
                {
                    mensajeError = 'Excepcion Invocando A Script MAP/REDUCE. Excepcion: '+ excepcion.message.toString();
                }
                log.error('Generacion URU-Resguardo', mensajeError);

                respuesta.error = true;
                respuesta.mensaje = mensajeError;
                //log.error('Generación URU-Resguardo', 'Generación URU-Resguardo - Excepcion Invocando A Script MAP/REDUCE - Excepcion : ' + excepcion.message);
            }
            log.audit('Generación URU-Resguardo', 'FIN Invocacion Script MAP/REDUCE');
            return respuesta;
        }

        function ultimoDiaMes(fecha)
        {
          var arrayFecha  = fecha.split('-');
          var fechaUltimo = new Date(arrayFecha[0], arrayFecha[1]);
          fechaUltimo.setDate(fechaUltimo.getDate() - 1);      
          
          return fechaUltimo.toLocaleString();
        } 

        return {
            onRequest: onRequest
        };
    });