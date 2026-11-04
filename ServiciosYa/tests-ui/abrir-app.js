const { remote } = require('webdriverio');

async function ejecutarPrueba() {
  let driver;

  console.log('====================================');
  console.log('SERVICIOSYA - PRUEBA VISUAL');
  console.log('====================================');
  console.log('');
  console.log('🤖 Conectando con Appium...');

  try {
    // =====================================
    // CONECTAR CON APPIUM
    // =====================================

    driver = await remote({
      hostname: '127.0.0.1',
      port: 4723,
      path: '/',

      capabilities: {
        platformName: 'Android',

        'appium:automationName':
          'UiAutomator2',

        'appium:deviceName':
          'emulator-5554',

        'appium:udid':
          'emulator-5554',

        'appium:appPackage':
          'com.pablovargas.capstoneservicios',

        'appium:appActivity':
          '.MainActivity',

        'appium:noReset':
          true,

        'appium:newCommandTimeout':
          120,
      },
    });

    console.log('');
    console.log('✅ Conexión con Appium realizada.');

    // =====================================
    // ABRIR SERVICIOSYA
    // =====================================

    console.log('');
    console.log('📱 Abriendo ServiciosYa...');

    await driver.activateApp(
      'com.pablovargas.capstoneservicios',
    );

    // =====================================
    // ESPERAR A QUE ABRA
    // =====================================

    await driver.pause(3000);

    // =====================================
    // OBTENER ACTIVITY ACTUAL
    // =====================================

    const currentActivity =
      await driver.getCurrentActivity();

    console.log('');
    console.log(
      'Activity actual:',
      currentActivity,
    );

    // =====================================
    // COMPROBAR ACTIVITY
    // =====================================

    if (
      !currentActivity.includes(
        'MainActivity',
      )
    ) {
      throw new Error(
        `ServiciosYa no está en primer plano. Activity encontrada: ${currentActivity}`,
      );
    }

    console.log('');
    console.log(
      '✅ ServiciosYa está en primer plano.',
    );

    // =====================================
    // DEJARLA VISIBLE 5 SEGUNDOS
    // =====================================

    console.log('');
    console.log(
      '👀 Dejando la aplicación visible durante 5 segundos...',
    );

    await driver.pause(5000);

    // =====================================
    // PRUEBA SUPERADA
    // =====================================

    console.log('');
    console.log('====================================');
    console.log('✅ PRUEBA COMPLETADA CORRECTAMENTE');
    console.log('====================================');
    console.log('');
    console.log(
      'Appium logró abrir y controlar ServiciosYa.',
    );
  } catch (error) {
    console.error('');
    console.error('====================================');
    console.error('❌ PRUEBA FALLIDA');
    console.error('====================================');

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  } finally {
    // =====================================
    // CERRAR SESIÓN APPIUM
    // =====================================

    if (driver) {
      console.log('');
      console.log(
        '🔌 Cerrando sesión de Appium...',
      );

      await driver.deleteSession();
    }
  }
}

ejecutarPrueba();