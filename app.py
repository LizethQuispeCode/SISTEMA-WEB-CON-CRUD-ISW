from flask import (
    Flask,
    request,
    jsonify,
    render_template,
    url_for,
    redirect
)

import mysql.connector

app = Flask(
    __name__, template_folder="templates", static_folder="static"
)
 
app.secret_key = "123456"

def get_db_connection():
    conexion = mysql.connector.connect(
        host="127.0.0.1",
        user="root",
        password="60182635",
        database="estudiantes"
    )
    return conexion

@app.route('/')
def index():
    # Mostrar el formulario de registro en la raíz
    return render_template('registro_estudiante.html')

@app.route('/api/registrar_estudiante', methods=['POST'])
def registrar_estudiante():
    # Aceptar tanto JSON (AJAX) como formularios HTML normales
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    nombre = data.get('nombre')
    apellido = data.get('apellido')
    correo = data.get('correo')
    telefono = data.get('telefono')
    curso = data.get('curso')

    conexion = get_db_connection()
    cursor = conexion.cursor()

    consulta = """
        INSERT INTO estudiantes (nombre, apellido, correo, telefono, curso)
        VALUES (%s, %s, %s, %s, %s)
    """
    valores = (nombre, apellido, correo, telefono, curso)

    try:
        cursor.execute(consulta, valores)
        conexion.commit()
        inserted_id = cursor.lastrowid
        respuesta = {
            'status': 'success',
            'message': 'Estudiante registrado correctamente.',
            'id': inserted_id
        }
    except mysql.connector.Error as err:
        conexion.rollback()
        respuesta = {
            'status': 'error',
            'message': f'Error al registrar el estudiante: {err}'
        }
    finally:
        cursor.close()
        conexion.close()

    # Si la petición vino desde un formulario HTML, renderizamos la página
    # y mostramos el resultado; si fue JSON (AJAX), devolvemos JSON.
    if request.is_json:
        return jsonify(respuesta)
    else:
        # Renderizar el mismo formulario con un resultado para mostrar feedback
        return render_template('registro_estudiante.html', resultado=respuesta)


@app.route('/api/estudiantes', methods=['GET'])
def listar_estudiantes():
    """Devuelve la lista de estudiantes en JSON."""
    conexion = get_db_connection()
    cursor = conexion.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, nombre, apellido, correo, telefono, curso, created_at FROM estudiantes ORDER BY id DESC")
        filas = cursor.fetchall()
        return jsonify({'status': 'success', 'estudiantes': filas})
    except mysql.connector.Error as err:
        return jsonify({'status': 'error', 'message': str(err)}), 500
    finally:
        cursor.close()
        conexion.close()


@app.route('/api/estudiantes/<int:estudiante_id>', methods=['GET'])
def obtener_estudiante(estudiante_id):
    """Devuelve un estudiante por su id."""
    conexion = get_db_connection()
    cursor = conexion.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, nombre, apellido, correo, telefono, curso, created_at FROM estudiantes WHERE id = %s", (estudiante_id,))
        fila = cursor.fetchone()
        if not fila:
            return jsonify({'status': 'error', 'message': 'Estudiante no encontrado.'}), 404
        return jsonify({'status': 'success', 'estudiante': fila})
    except mysql.connector.Error as err:
        return jsonify({'status': 'error', 'message': str(err)}), 500
    finally:
        cursor.close()
        conexion.close()


@app.route('/api/estudiantes/<int:estudiante_id>', methods=['PUT'])
def actualizar_estudiante(estudiante_id):
    """Actualiza los datos de un estudiante."""
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    nombre = data.get('nombre')
    apellido = data.get('apellido')
    correo = data.get('correo')
    telefono = data.get('telefono')
    curso = data.get('curso')

    # Validación mínima
    if not nombre or not apellido or not correo or not curso:
        return jsonify({'status': 'error', 'message': 'Faltan campos obligatorios.'}), 400

    conexion = get_db_connection()
    cursor = conexion.cursor()
    try:
        cursor.execute(
            "UPDATE estudiantes SET nombre=%s, apellido=%s, correo=%s, telefono=%s, curso=%s WHERE id=%s",
            (nombre, apellido, correo, telefono, curso, estudiante_id)
        )
        conexion.commit()
        if cursor.rowcount == 0:
            return jsonify({'status': 'error', 'message': 'Estudiante no encontrado.'}), 404
        return jsonify({'status': 'success', 'message': 'Estudiante actualizado correctamente.'})
    except mysql.connector.Error as err:
        conexion.rollback()
        return jsonify({'status': 'error', 'message': str(err)}), 500
    finally:
        cursor.close()
        conexion.close()


@app.route('/api/estudiantes/<int:estudiante_id>', methods=['DELETE'])
def eliminar_estudiante(estudiante_id):
    """Elimina un estudiante por su id."""
    conexion = get_db_connection()
    cursor = conexion.cursor()
    try:
        cursor.execute("DELETE FROM estudiantes WHERE id = %s", (estudiante_id,))
        conexion.commit()
        if cursor.rowcount == 0:
            return jsonify({'status': 'error', 'message': 'Estudiante no encontrado.'}), 404
        return jsonify({'status': 'success', 'message': 'Estudiante eliminado correctamente.'})
    except mysql.connector.Error as err:
        conexion.rollback()
        return jsonify({'status': 'error', 'message': str(err)}), 500
    finally:
        cursor.close()
        conexion.close()

if __name__ == "__main__":
    app.run(debug=True)