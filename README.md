# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Roles y Acceso a Módulos

El sistema utiliza un sistema de roles para controlar el acceso a los diferentes módulos. A continuación se detalla el acceso para cada rol:

### 1. Rol: Administrador (`admin`)
Tendrá acceso a **TODOS** los módulos sin excepción. Su objetivo es gestionar la configuración global, supervisar toda la actividad y administrar los datos maestros.
- **Panel**: Vista general de toda la escuela.
- **Escuelas**: Crear y gestionar escuelas.
- **Académico**: Gestionar asignaturas, cursos y secciones.
- **Estudiantes**: Administrar todos los perfiles de estudiantes.
- **Profesores**: Administrar todos los perfiles de profesores y sus asignaciones.
- **Calificaciones**: Ver y gestionar las calificaciones de todos los estudiantes.
- **Finanzas**: Gestionar todos los pagos de matrícula.
- **Comunicación**: Supervisar la comunicación en toda la plataforma.
- **Configuración**: Ajustes generales del sistema y gestión de roles.

### 2. Rol: Profesor (`teacher`)
Su acceso se centra en la gestión de sus cursos y estudiantes asignados.
- **Panel**: Vista de sus cursos, próximos eventos y actividad de sus estudiantes.
- **Académico**: Ver los cursos y asignaturas que imparte.
- **Estudiantes**: Ver la lista de estudiantes de sus cursos.
- **Calificaciones**: Registrar y modificar las calificaciones de sus estudiantes.
- **Comunicación**: Enviar y recibir mensajes de sus estudiantes y padres.

### 3. Rol: Estudiante (`student`)
Acceso limitado a su propia información académica y personal.
- **Panel**: Resumen de sus calificaciones, tareas y próximos eventos.
- **Académico**: Ver sus cursos y el material de estudio.
- **Calificaciones**: Ver su propio historial de calificaciones.
- **Finanzas**: Ver su estado de cuenta y realizar pagos.
- **Comunicación**: Enviar y recibir mensajes de sus profesores.

### 4. Rol: Padre (`parent`)
Acceso para supervisar el progreso de sus hijos.
- **Panel**: Resumen del progreso académico de su(s) hijo(s).
- **Estudiantes**: Ver el perfil y horario de su(s) hijo(s).
- **Calificaciones**: Ver las calificaciones de su(s) hijo(s).
- **Finanzas**: Ver el estado de cuenta y realizar pagos de la matrícula de su(s) hijo(s).
- **Comunicación**: Comunicarse con los profesores de su(s) hijo(s).

## Índices de Firestore Requeridos

Para que ciertas consultas complejas en la aplicación funcionen correctamente y no generen errores, es necesario crear los siguientes índices compuestos en tu base de datos de Firestore.

### Cómo Crear los Índices

Puedes crear estos índices manualmente en la Consola de Firebase.

1.  Ve a tu proyecto en la [Consola de Firebase](https://console.firebase.google.com/).
2.  En el menú de la izquierda, selecciona **Compilación > Firestore Database**.
3.  Ve a la pestaña **Índices** y haz clic en **Crear índice**.

### Índice 1: Para Consultar Usuarios por Escuela y Rol

Este índice es fundamental para poder listar profesores o estudiantes que pertenecen a una escuela específica.

- **ID de colección**: `users`
- **Campos a indexar**:
    1. `schoolId` - **Ascendente**
    2. `role` - **Ascendente**
- **Ámbito de la consulta**: Colección

### Índice 2: Para Consultar los Cursos de un Estudiante

Este índice utiliza un "grupo de colecciones" para permitir que un estudiante encuentre rápidamente todos los cursos en los que está inscrito.

- **ID del grupo de colecciones**: `students`
- **Campos a indexar**:
    1. `studentId` - **Ascendente**
- **Ámbito de la consulta**: Grupo de colecciones

### Índice 3: Para Consultar Registros de Asistencia por Curso y Fecha

Este índice es crucial para el módulo de asistencia, permitiendo a los profesores buscar rápidamente los registros de un curso específico en una fecha determinada.

- **ID de colección**: `attendance`
- **Campos a indexar**:
    1. `courseId` - **Ascendente**
    2. `date` - **Ascendente**
- **Ámbito de la consulta**: Colección

Una vez que crees estos índices, Firestore tardará unos minutos en construirlos. Después de eso, las consultas que antes fallaban deberían funcionar correctamente.
