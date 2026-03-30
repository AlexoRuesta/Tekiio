/**
 * Librería para manejo de formularios en SuiteScript 2.1
 * 
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(["N/ui/serverWidget", "N/format", "N/record", 'N/ui/message'], 
function (serverWidget, format, record, message) {

    /**
     * Clase para manejar constantes de la aplicación
     * @class Constant
     */
    class Constant {
        constructor() {
            /** @type {number} Valor por defecto para selects vacíos */
            this.EMPTY_SELECT_VALUE = -1;
            
            /** @type {number} Tamaño de página por defecto */
            this.PAGE_SIZE = 500;
            
            /** @type {number} Zona horaria por defecto (GMT-3) */
            this.DEFAULT_TIMEZONE_OFFSET = -3;
        }
    }

    /**
     * Clase wrapper para campos de formulario con métodos utilitarios
     * @class Field
     */
    class Field {
        /**
         * Constructor de Field
         * @param {Object} field - Objeto field de NetSuite
         */
        constructor(field) {
            if (!field) {
                throw new Error('Field object is required');
            }
            this.field = field;
        }

        /**
         * Agrega una opción a un campo de tipo select
         * @param {string|number} value - Valor de la opción
         * @param {string} text - Texto visible de la opción
         * @param {boolean} [isSelected=false] - Si la opción está seleccionada
         * @returns {Field} Instancia actual para method chaining
         */
        addSelectOption = (value, text, isSelected = false) => {
            if (value === undefined || text === undefined) {
                throw new Error('Valor y texto son requeridos');
            }
            
            this.field.addSelectOption({
                value: value,
                text: text,
                isSelected: isSelected
            });
            return this;
        }

        /**
         * Actualiza el tipo de display del campo
         * @param {string} displayType - Tipo de display (serverWidget.FieldDisplayType)
         * @returns {Field} Instancia actual para method chaining
         */
        updateDisplayType = (displayType) => {
            this.field.updateDisplayType({ 
                displayType:  serverWidget.FieldDisplayType[displayType.toUpperCase()] || displayType 
            });
            return this;
        }

        /**
         * Actualiza el tipo de layout del campo
         * @param {string} layoutType - Tipo de layout (serverWidget.FieldLayoutType)
         * @returns {Field} Instancia actual para method chaining
         */
        updateLayoutType = (layoutType) => {
            this.field.updateLayoutType({ 
                layoutType: layoutType
            });
            return this;
        }

        /**
         * Actualiza el tipo de break del campo
         * @param {string} breakType - Tipo de break (serverWidget.FieldBreakType)
         * @returns {Field} Instancia actual para method chaining
         */
        updateBreakType = (breakType) => {
            this.field.updateBreakType({ 
                breakType: breakType
            });
            return this;
        }

        /**
         * Establece el valor por defecto del campo
         * @param {*} value - Valor por defecto
         * @returns {Field} Instancia actual para method chaining
         */
        setDefaultValue = (value) => {
            this.field.defaultValue = value;
            return this;
        }

        /**
         * Obtiene el valor por defecto del campo
         * @returns {*} Valor por defecto
         */
        getDefaultValue = () => {
            return this.field.defaultValue;
        }

        /**
         * Establece si el campo es obligatorio
         * @param {boolean} isMandatory - True si es obligatorio
         * @returns {Field} Instancia actual para method chaining
         */
        setMandatory = (isMandatory) => {
            this.field.isMandatory = Boolean(isMandatory);
            return this;
        }

        /**
         * Establece si el campo está deshabilitado
         * @param {boolean} isDisabled - True si está deshabilitado
         * @returns {Field} Instancia actual para method chaining
         */
        setDisabled = (isDisabled) => {
            this.field.isDisabled = Boolean(isDisabled);
            return this;
        }

        /**
         * Establece el texto de ayuda del campo
         * @param {string} helpText - Texto de ayuda
         * @returns {Field} Instancia actual para method chaining
         */
        setHelpText = (helpText) => {
            this.field.setHelpText({ help: helpText });
            return this;
        }
    }

    /**
     * Clase wrapper para sublistas con métodos utilitarios
     * @class SubList
     */
    class SubList {
        /**
         * Constructor de SubList
         * @param {Object} sublist - Objeto sublist de NetSuite
         */
        constructor(sublist) {
            if (!sublist) {
                throw new Error('Sublist object is required');
            }
            this.sublist = sublist;
        }

        /**
         * Agrega un campo a la sublista
         * @param {string} id - ID del campo
         * @param {string} type - Tipo del campo (serverWidget.FieldType)
         * @param {string} label - Etiqueta del campo
         * @param {string} [source=null] - Fuente del campo para tipos select/multiselect
         * @returns {Field} Instancia de Field
         */
        addSublistField = (id, type, label, source = null) => {
            if (!id || !type || !label) {
                throw new Error('ID, type and label are required for sublist fields');
            }

            const fieldConfig = {
                id: id,
                type: type,
                label: label
            };

            if (source) {
                fieldConfig.source = source;
            }

            return new Field(this.sublist.addField(fieldConfig));
        }

        /**
         * Agrega un campo oculto a la sublista
         * @param {string} id - ID del campo
         * @param {string} type - Tipo del campo
         * @param {string} label - Etiqueta del campo
         * @param {string} [source=null] - Fuente del campo
         * @returns {Field} Instancia de Field con display tipo HIDDEN
         */
        addSublistFieldHidden = (id, type, label, source = null) => {
            const field = this.addSublistField(id, type, label, source);
            return field.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
        }

        /**
         * Establece un valor en la sublista
         * @param {string} id - ID del campo
         * @param {number} line - Número de línea (base 0)
         * @param {*} value - Valor a establecer
         * @returns {SubList} Instancia actual para method chaining
         */
        setSublistValue = (id, line, value) => {
            if (!id || line < 0) {
                throw new Error('Valid ID and line number are required');
            }

            this.sublist.setSublistValue({
                id: id,
                line: line,
                value: value
            });
            return this;
        }

        /**
         * Agrega botón de refresh a la sublista
         * @returns {SubList} Instancia actual para method chaining
         */
        addRefreshButton = () => {
            this.sublist.addRefreshButton();
            return this;
        }

        /**
         * Agrega botones de marcar/desmarcar todo
         * @returns {SubList} Instancia actual para method chaining
         */
        addMarkAllButtons = () => {
            this.sublist.addMarkAllButtons();
            return this;
        }
    }

    /**
     * Clase principal para manejo de interfaz de usuario
     * @class UserInterface
     */
    class UserInterface {
        constructor() {
            /** @type {Object|null} Objeto form de NetSuite */
            this.FORM = null;
            
            /** @type {Object} Referencia al módulo message */
            this.MESSAGE = message;
            
            /** @type {Object} Nombres de campos del formulario */
            this.FIELDS_NAME = this.getFormFieldsName();
            
            /** @type {Object} IDs de campos del formulario */
            this.FIELDS_ID = this.getFormFieldsId();
            
            /** @type {Constant} Instancia de constantes */
            this.CONSTANT = new Constant();
        }

        /**
         * Inicializa la clase
         */
        init = () => {
            log.debug("UserInterface", "Iniciando clase UserInterface");
        }

        /**
         * Crea un nuevo formulario
         * @param {Object} config - Configuración del formulario
         * @param {string} config.title - Título del formulario
         * @param {boolean} [config.hideNavBar=false] - Ocultar barra de navegación
         * @returns {UserInterface} Instancia actual para method chaining
         */
        createForm = (config) => {
            if (typeof config === 'string') {
                // Compatibilidad con versión anterior
                this.FORM = serverWidget.createForm({ title: config });
            } else if (config && config.title) {
                this.FORM = serverWidget.createForm(config);
            } else {
                throw new Error('Form title is required');
            }
            return this;
        }

        /**
         * Agrega botón de submit al formulario
         * @param {string} [label='Submit'] - Etiqueta del botón
         * @returns {UserInterface} Instancia actual para method chaining
         */
        addSubmitButton = (label = 'Submit') => {
            if (!this.FORM) {
                throw new Error('Form must be created before adding submit button');
            }
            this.FORM.addSubmitButton({ label: label });
            return this;
        }

        /**
         * Agrega mensaje inicial a la página
         * @param {string} messageText - Texto del mensaje
         * @param {string} type - Tipo de mensaje (CONFIRMATION, ERROR, INFORMATION, WARNING)
         * @param {string} [title=null] - Título del mensaje
         * @param {number} [duration=null] - Duración en millisegundos
         * @returns {UserInterface} Instancia actual para method chaining
         */
        addPageInitMessage = (messageText, type, title = null, duration = null) => {
            if (!this.FORM) {
                throw new Error('Form must be created before adding messages');
            }

            if (!messageText || !type) {
                throw new Error('Message text and type are required');
            }

            const messageConfig = {
                message: messageText,
                type: this.MESSAGE.Type[type.toUpperCase()]
            };

            if (title) {
                messageConfig.title = title;
            }

            if (duration) {
                messageConfig.duration = duration;
            }

            this.FORM.addPageInitMessage(messageConfig);
            return this;
        }

        /**
         * Agrega un campo al formulario
         * @param {string} id - ID del campo
         * @param {string} type - Tipo del campo
         * @param {string} label - Etiqueta del campo
         * @param {string} [container=null] - ID del contenedor
         * @param {string} [source=null] - Fuente para campos select
         * @returns {Field} Instancia de Field
         */
        addField = (id, type, label, container = null, source = null) => {
            if (!this.FORM) {
                throw new Error('Form must be created before adding fields');
            }

            if (!id || !type || !label) {
                throw new Error('ID, type and label are required for fields');
            }

            const fieldConfig = {
                id: id,
                type: serverWidget.FieldType[type.toUpperCase()],
                label: label
            };

            if (container) {
                fieldConfig.container = container;
            }

            if (source) {
                fieldConfig.source = source;
            }

            return new Field(this.FORM.addField(fieldConfig));
        }

        /**
         * Agrega una pestaña al formulario
         * @param {string} id - ID de la pestaña
         * @param {string} label - Etiqueta de la pestaña
         * @returns {UserInterface} Instancia actual para method chaining
         */
        addTab = (id, label) => {
            if (!this.FORM) {
                throw new Error('Form must be created before adding tabs');
            }

            if (!id || !label) {
                throw new Error('ID and label are required for tabs');
            }

            this.FORM.addTab({ id: id, label: label });
            return this;
        }

        /**
         * Agrega una sub-pestaña al formulario
         * @param {string} id - ID de la sub-pestaña
         * @param {string} label - Etiqueta de la sub-pestaña
         * @param {string} tab - ID de la pestaña padre
         * @returns {UserInterface} Instancia actual para method chaining
         */
        addSubtab = (id, label, tab) => {
            if (!this.FORM) {
                throw new Error('Form must be created before adding subtabs');
            }

            if (!id || !label || !tab) {
                throw new Error('ID, label and tab are required for subtabs');
            }

            this.FORM.addSubtab({
                id: id,
                label: label,
                tab: tab
            });
            return this;
        }

        /**
         * Agrega una sublista al formulario
         * @param {string} id - ID de la sublista
         * @param {string} type - Tipo de sublista
         * @param {string} label - Etiqueta de la sublista
         * @param {string} [tab=null] - ID de la pestaña
         * @returns {SubList} Instancia de SubList
         */
        addSublist = (id, type, label, tab = null) => {
            if (!this.FORM) {
                throw new Error('Form must be created before adding sublists');
            }

            if (!id || !type || !label) {
                throw new Error('ID, type and label are required for sublists');
            }

            const sublistConfig = {
                id: id,
                type: type,
                label: label
            };

            if (tab) {
                sublistConfig.tab = tab;
            }

            return new SubList(this.FORM.addSublist(sublistConfig));
        }

        /**
         * Agrega un botón al formulario
         * @param {string} id - ID del botón
         * @param {string} label - Etiqueta del botón
         * @param {string} functionName - Nombre de la función a ejecutar
         * @returns {UserInterface} Instancia actual para method chaining
         */
        addButton = (id, label, functionName) => {
            if (!this.FORM) {
                throw new Error('Form must be created before adding buttons');
            }

            if (!id || !label || !functionName) {
                throw new Error('ID, label and functionName are required for buttons');
            }

            this.FORM.addButton({
                id: id,
                label: label,
                functionName: functionName
            });
            return this;
        }

        /**
         * Agrega un grupo de campos al formulario
         * @param {string} id - ID del grupo
         * @param {string} label - Etiqueta del grupo
         * @param {string} [tab=null] - ID de la pestaña
         * @returns {Object} Referencia al grupo de campos
         */
        addFieldGroup = (id, label, tab = null) => {
            if (!this.FORM) {
                throw new Error('Form must be created before adding field groups');
            }

            if (!id || !label) {
                throw new Error('ID and label are required for field groups');
            }

            const groupConfig = { id: id, label: label };
            if (tab) {
                groupConfig.tab = tab;
            }

            return this.FORM.addFieldGroup(groupConfig);
        }

        /**
         * Obtiene valores específicos de una subsidiaria
         * @param {string|number} subsidiaryID - ID de la subsidiaria
         * @returns {Object} Objeto con datos de la subsidiaria
         * @throws {Error} Si no se puede cargar la subsidiaria
         */
        getValuesSubsidiary = (subsidiaryID) => {
            if (!subsidiaryID) {
                throw new Error('Subsidiary ID is required');
            }

            try {
                const customSub = record.load({ 
                    type: "subsidiary", 
                    id: subsidiaryID 
                });

                return {
                    ruc: customSub.getValue("federalidnumber") || '',
                    razonSocial: customSub.getValue("legalname") || '',
                    direccion: customSub.getValue("mainaddress_text") || '', 
                    remitente: customSub.getValue("legalname") || ''
                };
            } catch (error) {
                log.error('getValuesSubsidiary', `Error loading subsidiary ${subsidiaryID}: ${error.message}`);
                throw new Error(`Cannot load subsidiary data: ${error.message}`);
            }
        }

        /**
         * Obtiene los nombres de los campos del formulario
         * @returns {Object} Objeto con nombres organizados por tipo
         */
        getFormFieldsName = () => {
            return {
                form: {},
                fieldgroup: {},
                field: {
                    page: "Índice de Página",
                },
                sublist: {},
                sublistfield: {},
                button: {}
            };
        }

        /**
         * Obtiene los IDs de los campos del formulario
         * @returns {Object} Objeto con IDs organizados por tipo
         */
        getFormFieldsId = () => {
            return {
                fieldgroup: {},
                field: {
                    project: "custpage_f_project", // Corregido typo 'proyect'
                    account: "custpage_f_account",
                    page: "custpage_f_page",
                    functions: "custpage_f_functions"
                },
                sublist: {
                    results: "custpage_sl_results"
                },
                sublistfield: {}
            };
        }

        /**
         * Agrega botón de reset al formulario
         * @returns {UserInterface} Instancia actual para method chaining
         */
        addResetButton = () => {
            if (!this.FORM) {
                throw new Error('Form must be created before adding reset button');
            }
            this.FORM.addResetButton();
            return this;
        }

        /**
         * Establece el script de cliente para el formulario
         * @param {string} clientScriptName - Nombre/path del script de cliente
         * @returns {UserInterface} Instancia actual para method chaining
         */
        setClientScript = (clientScriptName) => {
            if (!this.FORM) {
                log.error("setClientScript", "Form must be created before setting client script");
                return this;
            }

            if (!clientScriptName) {
                throw new Error('Client script name is required');
            }

            log.debug("setClientScript", `Setting client script: ${clientScriptName}`);
            this.FORM.clientScriptModulePath = clientScriptName;
            return this;
        }

        /**
         * Obtiene el objeto form actual
         * @returns {Object|null} Objeto form de NetSuite
         */
        getForm = () => {
            return this.FORM;
        }
    }

    /**
     * Clase para manejo de auditoría y utilidades de fecha
     * @class Auditoria
     */
    class Auditoria {
        constructor() {
            /** @type {number} Offset de timezone por defecto */
            this.timezoneOffset = -3;
        }

        /**
         * Inicializa la clase de auditoría
         */
        init = () => {
            log.debug("Auditoria", "Iniciando clase Auditoria");
        }

        /**
         * Obtiene la fecha y hora actual ajustada a la zona horaria
         * @param {number} [timezoneOffset=-3] - Offset de timezone en horas
         * @returns {Date} Fecha ajustada a la zona horaria
         */
        getDate = (timezoneOffset = this.timezoneOffset) => {
            try {
                const fechaProceso = new Date();
                const utc1 = fechaProceso.getTime() + (fechaProceso.getTimezoneOffset() * 60000);
                const tempDate = new Date(utc1 + (3600000 * timezoneOffset));
                
                const myDate = format.format({ 
                    value: tempDate, 
                    type: format.Type.DATE 
                });
                
                const myTime = format.format({ 
                    value: tempDate, 
                    type: format.Type.TIMEOFDAY 
                });
                
                const currentDate = `${myDate} ${myTime}`;
                
                return format.parse({ 
                    value: currentDate, 
                    type: format.Type.DATETIMETZ 
                });
            } catch (error) {
                log.error('Auditoria.getDate', `Error getting date: ${error.message}`);
                return new Date(); // Fallback a fecha actual del sistema
            }
        }

        /**
         * Obtiene la fecha actual como string formateado
         * @param {string} [formatType='DATE'] - Tipo de formato
         * @returns {string} Fecha formateada
         */
        getFormattedDate = (formatType = format.Type.DATE) => {
            const currentDate = this.getDate();
            return format.format({
                value: currentDate,
                type: formatType
            });
        }

        /**
         * Obtiene timestamp actual
         * @returns {number} Timestamp en millisegundos
         */
        getTimestamp = () => {
            return this.getDate().getTime();
        }
    }

    // Exportación de clases y funciones
    return {
        UserInterface,
        Auditoria
    };
});