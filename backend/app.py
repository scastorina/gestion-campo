import dash
from dash import html, dcc, dash_table, callback, Input, Output, State, no_update, ALL
import pandas as pd
import requests
import datetime
from dateutil.relativedelta import relativedelta
import uuid
import calendar

app = dash.Dash(__name__, suppress_callback_exceptions=True, title="Control y Carga")

BASE_URL = "https://pomco.strangled.net/v1"
FORM_ID = "RDT Frutales"

def get_auth_header(token):
    return {'Authorization': f'Bearer {token}'}

def cargar_datos_completos(token):
    odata_url = f"{BASE_URL}/projects/1/forms/{FORM_ID}.svc/Submissions?$top=5000"
    form_details_url = f"{BASE_URL}/projects/1/forms/{FORM_ID}"
    headers = get_auth_header(token)
    response_odata = requests.get(odata_url, headers=headers)
    response_odata.raise_for_status()
    df = pd.DataFrame(response_odata.json()['value'])
    response_form = requests.get(form_details_url, headers=headers)
    response_form.raise_for_status()
    version = response_form.json()['version']
    df['fecha'] = pd.to_datetime(df['fecha'], errors='coerce')
    df['horas'] = pd.to_numeric(df['horas'], errors='coerce').fillna(0)
    df['horas_extra'] = pd.to_numeric(df['horas_extra'], errors='coerce').fillna(0)
    df.dropna(subset=['fecha'], inplace=True)
    return df, version

def crear_o_editar_envio(token, datos_formulario, version_formulario, instance_id_original=None):
    try:
        es_edicion = instance_id_original is not None
        new_instance_id = f"uuid:{uuid.uuid4()}"
        meta_xml = (
            f"<deprecatedID>{instance_id_original}</deprecatedID><instanceID>{new_instance_id}</instanceID>"
            if es_edicion else
            f"<instanceID>{new_instance_id}</instanceID>"
        )
        xml_string = f"""<data id=\"{FORM_ID}\" version=\"{version_formulario}\">
            <fecha>{datos_formulario['fecha'].strftime('%Y-%m-%d')}</fecha>
            <empleado>{datos_formulario['empleado']}</empleado>
            <ceco>{datos_formulario['ceco']}</ceco>
            <tarea>{datos_formulario['tarea']}</tarea>
            <nota>{datos_formulario['nota']}</nota>
            <horas>{datos_formulario['horas']}</horas>
            <horas_extra>{datos_formulario['horas_extra']}</horas_extra>
            <guardia>{datos_formulario['guardia']}</guardia>
            <meta>{meta_xml}</meta>
        </data>"""
        headers = get_auth_header(token)
        headers['Content-Type'] = 'application/xml;charset=UTF-8'
        if es_edicion:
            url = f"{BASE_URL}/projects/1/forms/{FORM_ID}/submissions/{instance_id_original}"
            response = requests.put(url, data=xml_string.encode('utf-8'), headers=headers)
            mensaje = "¡Éxito! Se editó el envío."
        else:
            url = f"{BASE_URL}/projects/1/forms/{FORM_ID}/submissions"
            response = requests.post(url, data=xml_string.encode('utf-8'), headers=headers)
            mensaje = "¡Éxito! Se creó el envío."
        if response.status_code == 409:
            return False, "CONFLICT"
        response.raise_for_status()
        return True, mensaje
    except requests.exceptions.HTTPError as e:
        return False, f"Error de API: {e.response.status_code} {e.response.text}"
    except Exception as e:
        return False, f"Error inesperado: {e}"

def eliminar_registro_odk(token, instance_id):
    try:
        headers = get_auth_header(token)
        url = f"{BASE_URL}/projects/1/forms/{FORM_ID}/submissions/{instance_id}"
        response = requests.delete(url, headers=headers)
        if response.status_code == 204:
            return True, "Registro eliminado exitosamente."
        else:
            return False, f"Error al eliminar: {response.status_code} {response.text}"
    except Exception as e:
        return False, f"Error inesperado: {e}"

def layout():
    return html.Div(id='dashboard-wrapper')

app.layout = layout()

@callback(
    Output('dashboard-wrapper', 'children'),
    Input('session-store', 'data')
)
def render_page_content(session_data):
    if not session_data or not session_data.get('token'):
        return dcc.Location(pathname="/login", id="redirect-login")
    return html.Div(className='contenedor-principal', children=[
        dcc.Store(id='store-main-data'),
        dcc.Store(id='store-opciones-dropdown'),
        dcc.Store(id='store-memoria-celda'),
        dcc.Store(id='store-form-version'),
        dcc.Store(id='store-trigger-refresh', data=0),
        dcc.Store(id='store-selected-period', storage_type='session'),
        html.Div(className='header', children=[
            html.H1("📋 Control y Carga de Horas"),
            html.A(html.Button('Cerrar Sesión'), href='/logout', style={'position': 'absolute', 'top': '20px', 'right': '20px'})
        ]),
        dcc.Loading(type="circle", children=html.Div(id='panel-alertas', className='panel')),
        html.Div(className='panel-filtros', children=[
            html.H4("Seleccionar Período de Trabajo"),
            dcc.Dropdown(id='filtro-periodo'),
        ]),
        html.Div(className='panel', children=[
            html.H3(id='titulo-matriz'),
            dcc.Loading(id="loading-matriz", type="circle", children=[
                dash_table.DataTable(
                    id='tabla-interactiva',
                    data=[], columns=[],
                    style_cell_conditional=[
                        {'if': {'column_id': 'empleado'}, 'width': '200px', 'textAlign': 'left', 'fontWeight': 'bold'}
                    ]
                )
            ]),
            html.P("🟩 Normal | 🟥 Exceso | 🟧 Múltiple | 🟨 Vacaciones | 🟦 CM", style={'textAlign': 'center', 'marginTop': '10px', 'fontSize': '14px'})
        ]),
        html.Div(className='panel', children=[
            html.H3("👇 Acción Rápida"),
            dcc.Loading(id="loading-accion", children=html.Div(id='zona-accion')),
            html.Div(id='notificacion-guardado', style={'marginTop': '15px'}),
            html.Div(id='notificacion-eliminar', style={'marginTop': '15px'})
        ]),
    ])

@callback(Output('store-selected-period', 'data'), Input('filtro-periodo', 'value'), prevent_initial_call=True)
def save_selected_period(periodo): return periodo

@callback(
    [Output('store-main-data', 'data'), Output('store-opciones-dropdown', 'data'), Output('store-form-version', 'data'), Output('filtro-periodo', 'options'), Output('filtro-periodo', 'value')],
    [Input('store-trigger-refresh', 'data')],
    [State('session-store', 'data'), State('store-selected-period', 'data')]
)
def fetch_data_from_odk(trigger_value, session_data, saved_period):
    if not session_data or not session_data.get('token'): return no_update, no_update, no_update, [], None
    try:
        df, version_formulario = cargar_datos_completos(session_data['token'])
        opciones_ceco = sorted(df['ceco'].astype(str).unique())
        opciones_tarea = sorted(df['tarea'].astype(str).unique())
        opciones_periodo = []
        if not df.empty:
            fecha_min, fecha_max = df['fecha'].min().date(), df['fecha'].max().date()
            start_loop_date = fecha_min.replace(day=1)
            while True:
                año, mes = start_loop_date.year, start_loop_date.month
                if start_loop_date.replace(day=15) > fecha_max + relativedelta(months=2): break
                opciones_periodo.append({'label': f"Período {calendar.month_name[mes]} {año}", 'value': f"{año}-{mes:02d}"})
                start_loop_date += relativedelta(months=1)
        opciones_periodo = sorted(opciones_periodo, key=lambda x: x['value'], reverse=True)
        valor_periodo_default = saved_period if saved_period else (opciones_periodo[0]['value'] if opciones_periodo else None)
        opciones_dropdown = {'ceco': opciones_ceco, 'tarea': opciones_tarea}
        return df.to_json(orient='split', date_format='iso'), opciones_dropdown, version_formulario, opciones_periodo, valor_periodo_default
    except Exception:
        return None, None, None, [], None

@callback(
    Output('panel-alertas', 'children'),
    Input('store-main-data', 'data')
)
def actualizar_panel_alertas(json_data):
    if not json_data: return html.H4("Cargando datos para generar alertas...")
    df_completo = pd.read_json(json_data, orient='split'); df_completo['fecha'] = pd.to_datetime(df_completo['fecha']).dt.date
    hoy = datetime.date.today()
    if hoy.weekday() >= 5: fecha_a_revisar = hoy - datetime.timedelta(days=(hoy.weekday() - 4))
    else: fecha_a_revisar = hoy
    dias_semana_es = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    nombre_dia_revisar = dias_semana_es[fecha_a_revisar.weekday()]
    fecha_limite_actividad = datetime.date.today() - datetime.timedelta(days=14)
    empleados_activos = df_completo[df_completo['fecha'] >= fecha_limite_actividad]['empleado'].unique()
    empleados_con_carga = df_completo[df_completo['fecha'] == fecha_a_revisar]['empleado'].unique()
    empleados_faltantes = sorted(list(set(empleados_activos) - set(empleados_con_carga)))
    if not empleados_faltantes:
        return html.H4(f"✅ ¡Al día! Sin cargas pendientes para el {nombre_dia_revisar} {fecha_a_revisar.strftime('%d/%m')}.", className='alerta-ok')
    else:
        return [html.H4(f"🚨 Cargas Faltantes para el {nombre_dia_revisar} {fecha_a_revisar.strftime('%d/%m')}", className='alerta-critica'), html.Ul([html.Li(e) for e in empleados_faltantes])]

@callback(
    [Output('tabla-interactiva', 'data'), Output('tabla-interactiva', 'columns'), Output('tabla-interactiva', 'style_data_conditional'), Output('titulo-matriz', 'children')],
    [Input('store-main-data', 'data'), Input('filtro-periodo', 'value')]
)
def actualizar_matriz(json_data, periodo_seleccionado):
    if not json_data or not periodo_seleccionado: return [], [], [], "Cargando datos..."
    df_completo = pd.read_json(json_data, orient='split'); df_completo['fecha'] = pd.to_datetime(df_completo['fecha'])
    año_fin, mes_fin = map(int, periodo_seleccionado.split('-')); fecha_fin_periodo = datetime.date(año_fin, mes_fin, 15); fecha_inicio_periodo = (fecha_fin_periodo.replace(day=1) - datetime.timedelta(days=1)).replace(day=16)
    titulo = f"Matriz de Cumplimiento ({fecha_inicio_periodo.strftime('%d/%m')} - {fecha_fin_periodo.strftime('%d/%m')})"
    df_periodo = df_completo[(df_completo['fecha'].dt.date >= fecha_inicio_periodo) & (df_completo['fecha'].dt.date <= fecha_fin_periodo)]
    empleados_activos = sorted(df_periodo['empleado'].unique()) if not df_periodo.empty else []
    if not empleados_activos: return [], [], [], titulo
    agg_funcs = {'horas': ['sum', 'count'], 'horas_extra': 'sum', 'tarea': 'first'}
    matriz_agregada = df_periodo.pivot_table(index='empleado', columns=df_completo['fecha'].dt.date, values=['horas', 'horas_extra', 'tarea'], aggfunc=agg_funcs).reindex(empleados_activos)
    matriz_display = pd.DataFrame(index=empleados_activos); rango_dias_periodo = pd.date_range(start=fecha_inicio_periodo, end=fecha_fin_periodo)
    for fecha_obj in rango_dias_periodo:
        fecha = fecha_obj.date(); col_display = []
        for empleado in empleados_activos:
            try:
                suma_horas = matriz_agregada.loc[empleado, ('horas', 'sum', fecha)]
                suma_horas_extra = matriz_agregada.loc[empleado, ('horas_extra', 'sum', fecha)]
                conteo = matriz_agregada.loc[empleado, ('horas', 'count', fecha)]
                tarea = matriz_agregada.loc[empleado, ('tarea', 'first', fecha)]
                texto_final = ""
                if pd.notna(tarea) and str(tarea).strip().lower() == "falta":
                    texto_final = "FALTA"
                elif pd.notna(tarea) and ("feriado" in str(tarea).lower() or "certificado" in str(tarea).lower()):
                    texto_final = "FERIADO"
                elif pd.notna(tarea) and 'vacaciones' in str(tarea).lower():
                    texto_final = "V"
                elif pd.notna(tarea) and 'falta con aviso' in str(tarea).lower():
                    texto_final = "CM"
                elif conteo > 0:
                    texto_horas = f"{int(suma_horas)}" if suma_horas == int(suma_horas) else f"{suma_horas:.1f}"
                    if suma_horas_extra > 0: texto_horas += f" + {int(suma_horas_extra)}" if suma_horas_extra == int(suma_horas_extra) else f" + {suma_horas_extra:.1f}"
                    texto_final = texto_horas
                    if conteo > 1: texto_final = f"{texto_final}({int(conteo)})"
                    total_horas_dia = suma_horas + suma_horas_extra
                    es_viernes = fecha.weekday() == 4
                    if (es_viernes and total_horas_dia > 8) or (not es_viernes and total_horas_dia > 9): texto_final += "!"
                col_display.append(texto_final)
            except KeyError: col_display.append("")
        matriz_display[fecha] = col_display
    estilos = []
    for fecha in matriz_display.columns:
        col_id_str = str(fecha)
        estilos.append({'if': {'column_id': col_id_str, 'filter_query': f'{{{col_id_str}}} = ""'}, 'backgroundColor': '#f8f9fa' if fecha.weekday() >= 5 else '#ffeef0'})
        estilos.append({'if': {'column_id': col_id_str, 'filter_query': f'{{{col_id_str}}} = "FALTA"'}, 'backgroundColor': '#f8d7da', 'fontWeight': 'bold'})
        estilos.append({'if': {'column_id': col_id_str, 'filter_query': f'{{{col_id_str}}} = "FERIADO"'}, 'backgroundColor': '#d1ecf1', 'fontWeight': 'bold'})
        estilos.append({'if': {'column_id': col_id_str, 'filter_query': f'{{{col_id_str}}} = "V"'}, 'backgroundColor': '#fff3cd', 'fontWeight': 'bold'})
        estilos.append({'if': {'column_id': col_id_str, 'filter_query': f'{{{col_id_str}}} = "CM"'}, 'backgroundColor': '#cfe2ff', 'fontWeight': 'bold'})
        estilos.append({'if': {'column_id': col_id_str, 'filter_query': f'{{{col_id_str}}} contains "("'}, 'backgroundColor': '#fd7e14', 'color': 'white', 'fontWeight': 'bold'})
        estilos.append({'if': {'column_id': col_id_str, 'filter_query': f'{{{col_id_str}}} contains "!"'}, 'backgroundColor': '#dc3545', 'color': 'white', 'fontWeight': 'bold'})
        estilos.append({'if': {'column_id': col_id_str, 'filter_query': f'{{{col_id_str}}} != "" && {{{col_id_str}}} != "FALTA" && {{{col_id_str}}} != "FERIADO" && {{{col_id_str}}} != "V" && {{{col_id_str}}} != "CM" && !({{{col_id_str}}} contains "(") ) && !({{{col_id_str}}} contains "!")'}, 'backgroundColor': '#d1e7dd'})
    for col in matriz_display.columns: matriz_display[col] = matriz_display[col]
    matriz_display.columns = [str(c) for c in matriz_display.columns]; matriz_display.reset_index(inplace=True); matriz_display.rename(columns={'index': 'empleado'}, inplace=True)
    columnas_tabla = [{"name": str(datetime.date.fromisoformat(c).day), "id": c} if c != 'empleado' else {"name": "Empleado", "id": "empleado"} for c in matriz_display.columns]
    datos_tabla = matriz_display.to_dict('records')
    return datos_tabla, columnas_tabla, estilos, titulo

@callback(
    [Output('zona-accion', 'children'), Output('store-memoria-celda', 'data')],
    [Input('tabla-interactiva', 'active_cell')],
    [State('tabla-interactiva', 'data'), State('store-main-data', 'data'), State('store-opciones-dropdown', 'data')]
)
def manejar_clic_celda(active_cell, data_tabla, json_data, opciones_dropdown):
    if not active_cell or not data_tabla or not json_data: return html.P("Hacé clic en una celda de la matriz para actuar."), no_update
    df_completo = pd.read_json(json_data, orient='split'); df_completo['fecha'] = pd.to_datetime(df_completo['fecha'])
    row_idx, col_id = active_cell['row'], active_cell['column_id']
    if col_id == 'empleado': return html.P("Seleccionaste un empleado. Por favor, hacé clic en una celda de día."), no_update
    empleado = data_tabla[row_idx]['empleado']; fecha_celda = datetime.date.fromisoformat(col_id)
    datos_existentes = df_completo[(df_completo['empleado'] == empleado) & (df_completo['fecha'].dt.date == fecha_celda)]
    if len(datos_existentes) > 1:
        botones = []
        for idx, row in datos_existentes.iterrows():
            botones.append(
                html.Button(f"Eliminar registro {idx + 1}", id={'type': 'btn-eliminar-dup', 'index': row['__id']}, n_clicks=0, style={'marginRight': '8px'})
            )
        return html.Div([
            html.H4(f"⚠️ Múltiples Cargas para: {empleado} el {fecha_celda.strftime('%d/%m/%Y')}"),
            dash_table.DataTable(data=datos_existentes[['ceco', 'tarea', 'horas', 'horas_extra', 'nota']].to_dict('records')),
            html.Div(botones)
        ]), no_update
    valores_form = {"ceco": None, "tarea": None, "horas": None, "horas_extra": 0, "guardia": "no", "nota": "", "instance_id": None}
    titulo_form, texto_boton = f"➕ Cargar para: {empleado}", "Guardar Nueva Carga"
    if not datos_existentes.empty:
        registro_a_editar = datos_existentes.iloc[0]; valores_form.update(registro_a_editar.to_dict()); valores_form['instance_id'] = registro_a_editar['__id']
        titulo_form, texto_boton = f"📝 Editar carga para: {empleado}", "Actualizar Carga"
    datos_memoria = {'empleado': empleado, 'instance_id': valores_form['instance_id']}
    formulario = html.Div([
        html.H4(titulo_form),
        html.Div(className='form-grid', children=[
            html.Div([html.Label("Fecha"), dcc.DatePickerSingle(id='input-fecha-carga', date=fecha_celda, display_format='DD/MM/YYYY')]),
            html.Div([html.Label("CeCo"), dcc.Dropdown(id='input-ceco', options=opciones_dropdown['ceco'], value=valores_form['ceco'])]),
            html.Div([html.Label("Tarea"), dcc.Dropdown(id='input-tarea', options=opciones_dropdown['tarea'], value=valores_form['tarea'])]),
            html.Div([html.Label("Horas"), dcc.Input(id='input-horas', type='number', min=0, step=0.5, value=valores_form['horas'])]),
            html.Div([html.Label("Horas Extra"), dcc.Input(id='input-horas_extra', type='number', min=0, step=0.5, value=valores_form['horas_extra'])]),
            html.Div([html.Label("Guardia"), dcc.Dropdown(id='input-guardia', options=['no', 'si'], value=valores_form['guardia'])]),
        ]),
        html.Label("Notas", style={'marginTop': '16px'}),
        dcc.Textarea(id='input-nota', value=valores_form['nota'], style={'width': '100%', 'height': '60px'}),
        html.Button(texto_boton, id='btn-guardar', n_clicks=0, style={'marginTop': '16px'})
    ])
    return formulario, datos_memoria

@callback(
    [Output('notificacion-guardado', 'children'),
     Output('notificacion-eliminar', 'children'),
     Output('store-trigger-refresh', 'data')],
    [
        Input('btn-guardar', 'n_clicks'),
        Input({'type': 'btn-eliminar-dup', 'index': ALL}, 'n_clicks')
    ],
    [
        State('session-store', 'data'), 
        State('store-form-version', 'data'), 
        State('store-memoria-celda', 'data'),
        State('input-fecha-carga', 'date'), State('input-ceco', 'value'), State('input-tarea', 'value'),
        State('input-horas', 'value'), State('input-horas_extra', 'value'),
        State('input-guardia', 'value'), State('input-nota', 'value'),
        State({'type': 'btn-eliminar-dup', 'index': ALL}, 'id')
    ],
    prevent_initial_call=True
)
def procesar_guardar_y_eliminar(
    n_clicks_guardar, n_clicks_eliminar, session_data, version_formulario, datos_memoria,
    fecha, ceco, tarea, horas, horas_extra, guardia, nota, eliminar_ids
):
    ctx = dash.callback_context
    noti_guardado = no_update
    noti_eliminar = no_update
    trigger_refresh = no_update

    if not ctx.triggered:
        return noti_guardado, noti_eliminar, trigger_refresh

    triggered_id = ctx.triggered_id

    if triggered_id == 'btn-guardar' and n_clicks_guardar:
        if not all([fecha, ceco, tarea, horas is not None]):
            noti_guardado = html.P("Error: Campos obligatorios faltantes.", style={'color': 'red'})
        elif not session_data or not session_data.get('token'):
            noti_guardado = html.P("Error de sesión.", style={'color': 'red'})
        else:
            datos_formulario = {
                "fecha": datetime.date.fromisoformat(fecha), "empleado": datos_memoria['empleado'], "ceco": ceco,
                "tarea": tarea, "horas": horas, "horas_extra": horas_extra or 0, "guardia": guardia or "no", "nota": nota or ""
            }
            success, message = crear_o_editar_envio(session_data['token'], datos_formulario, version_formulario, instance_id_original=datos_memoria.get('instance_id'))
            if message == "CONFLICT":
                noti_guardado = html.P("Registro actualizado. Refrescando datos, intente de nuevo.", style={'color': 'orange'})
                trigger_refresh = datetime.datetime.now().timestamp()
            elif success:
                noti_guardado = html.P(message, style={'color': 'green'})
                trigger_refresh = datetime.datetime.now().timestamp()
            else:
                noti_guardado = html.P(message, style={'color': 'red'})
        return noti_guardado, no_update, trigger_refresh

    if isinstance(triggered_id, dict) and triggered_id.get('type') == 'btn-eliminar-dup':
        idx = [i for i, btn_id in enumerate(eliminar_ids) if btn_id == triggered_id]
        if idx and session_data and session_data.get('token'):
            instance_id = triggered_id['index']
            success, msg = eliminar_registro_odk(session_data['token'], instance_id)
            color = 'green' if success else 'red'
            noti_eliminar = html.P(msg, style={'color': color})
            trigger_refresh = datetime.datetime.now().timestamp()
            return no_update, noti_eliminar, trigger_refresh
        else:
            noti_eliminar = html.P("Error al eliminar registro.", style={'color': 'red'})
            return no_update, noti_eliminar, no_update

    return noti_guardado, noti_eliminar, trigger_refresh

if __name__ == "__main__":
    app.run_server(debug=True)
