// Interceptar el envío para mostrar un aviso sin perder la página (opcional)
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registroForm');
  if (!form) return;
  let editingId = null;
  const submitButton = form.querySelector('button[type="submit"]');
  const totalCount = document.getElementById('totalCount');

  // Cargar la lista al inicio
  loadEstudiantes();

  form.addEventListener('submit', async (e) => {
    // Evitar envío normal para usar AJAX y limpiar el formulario en éxito
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Buscar el contenedor donde mostrar el mensaje (sección del formulario)
    const container = form.closest('section') || form.parentElement || document.body;

    // Eliminar mensajes previos
    const prev = container.querySelector('[data-alert]');
    if (prev) prev.remove();

    try {
      let res, json;
      if (editingId) {
        // Update existing
        res = await fetch(`/api/estudiantes/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        json = await res.json();
      } else {
        res = await fetch('/api/registrar_estudiante', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        json = await res.json();
      }

      // Crear elemento de mensaje usando clases Tailwind (coincidentes con plantilla)
      const msg = document.createElement('div');
      msg.setAttribute('data-alert', 'true');
      msg.className = 'mb-4 rounded-lg p-4';
      if (json.status === 'success') {
        msg.className += ' border border-green-100 bg-green-50 text-green-800';
      } else {
        msg.className += ' border border-red-100 bg-red-50 text-red-800';
      }
      msg.textContent = json.message || 'Respuesta recibida.';

      // Insertar mensaje encima del formulario
      container.insertBefore(msg, container.firstChild);

      // Si fue exitoso, limpiar el formulario, resetear estado y recargar lista
      if (json.status === 'success') {
        form.reset();
        const first = form.querySelector('input, select, textarea');
        if (first) first.focus();
        // Si venimos de una edición, limpiar el modo edición
        if (editingId) {
          clearEditing();
        }
        loadEstudiantes();
      }
    } catch (err) {
      console.error(err);
      const errMsg = document.createElement('div');
      errMsg.setAttribute('data-alert', 'true');
      errMsg.className = 'mb-4 rounded-lg border border-red-100 bg-red-50 p-4 text-red-800';
      errMsg.textContent = 'Error de red o del servidor. Intenta nuevamente.';
      container.insertBefore(errMsg, container.firstChild);
    }
  });

  // --- Funciones para CRUD en la UI ---
  async function loadEstudiantes() {
    const listContainer = document.getElementById('estudiantesList');
    if (!listContainer) return;
    listContainer.innerHTML = '<div class="text-sm text-gray-500">Cargando...</div>';
    try {
      const res = await fetch('/api/estudiantes');
      const json = await res.json();
      if (json.status === 'success') {
        renderList(json.estudiantes || []);
      } else {
        listContainer.innerHTML = `<div class="text-sm text-red-600">${json.message || 'Error al cargar'}</div>`;
      }
    } catch (err) {
      console.error(err);
      listContainer.innerHTML = '<div class="text-sm text-red-600">Error de red al cargar interesados.</div>';
    }
  }

  function renderList(items) {
    const listContainer = document.getElementById('estudiantesList');
    if (!listContainer) return;
    if (!items.length) {
      listContainer.innerHTML = '<div class="text-sm text-gray-500">No hay registros aún.</div>';
      if (totalCount) totalCount.textContent = '0';
      return;
    }
    if (totalCount) totalCount.textContent = `${items.length} registrados`;

    listContainer.innerHTML = '';
    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'p-3 border rounded-lg flex items-center justify-between gap-4';

      const left = document.createElement('div');
      left.className = 'min-w-0';
      left.innerHTML = `
        <div class="font-semibold text-gray-900">${escapeHtml(item.nombre)} ${escapeHtml(item.apellido)}</div>
        <div class="text-sm text-gray-600">${escapeHtml(item.correo)} · ${escapeHtml(item.telefono || '')}</div>
        <div class="text-sm text-gray-500">Curso: ${escapeHtml(item.curso)}</div>
      `;

      const actions = document.createElement('div');
      actions.className = 'flex items-center gap-2';

      const editBtn = document.createElement('button');
      editBtn.className = 'px-3 py-1 rounded bg-yellow-100 text-yellow-800 text-sm hover:bg-yellow-200';
      editBtn.textContent = 'Editar';
      editBtn.addEventListener('click', () => setEditing(item));

      const delBtn = document.createElement('button');
      delBtn.className = 'px-3 py-1 rounded bg-red-100 text-red-800 text-sm hover:bg-red-200';
      delBtn.textContent = 'Eliminar';
      delBtn.addEventListener('click', () => eliminar(item.id));

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      row.appendChild(left);
      row.appendChild(actions);

      listContainer.appendChild(row);
    });
  }

  function setEditing(item) {
    editingId = item.id;
    // Poblar el formulario con los datos
    form.querySelector('#nombre').value = item.nombre || '';
    form.querySelector('#apellido').value = item.apellido || '';
    form.querySelector('#correo').value = item.correo || '';
    form.querySelector('#telefono').value = item.telefono || '';
    form.querySelector('#curso').value = item.curso || '';
    // Cambiar el texto del botón
    if (submitButton) submitButton.textContent = 'Guardar cambios';
    // Enfocar
    const first = form.querySelector('input, select, textarea');
    if (first) first.focus();
  }

  function clearEditing() {
    editingId = null;
    if (submitButton) submitButton.textContent = 'Registrar';
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/estudiantes/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status === 'success') {
        loadEstudiantes();
      } else {
        alert(json.message || 'Error al eliminar');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al eliminar');
    }
  }

  function escapeHtml(unsafe) {
    if (!unsafe && unsafe !== 0) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
