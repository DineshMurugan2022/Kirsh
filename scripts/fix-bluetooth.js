const fs = require('fs');
const path = require('path');

// 1. Patch build.gradle for react-native-bluetooth-classic
const gradlePath = path.join(__dirname, '..', 'node_modules', 'react-native-bluetooth-classic', 'android', 'build.gradle');

if (fs.existsSync(gradlePath)) {
    console.log('Patching build.gradle...');
    let content = fs.readFileSync(gradlePath, 'utf8');

    // Clean header and fix android block
    const pluginLine = "apply plugin: 'com.android.library'";
    const pluginIndex = content.indexOf(pluginLine);
    if (pluginIndex > -1) content = content.substring(pluginIndex);

    const androidRegex = /android \{[\s\S]*?\n\}/;
    const newAndroidBlock = `android {
    namespace "kjd.reactnative.bluetooth"
    compileSdkVersion getExtOrDefault('compileSdkVersion', 35)
    buildToolsVersion getExtOrDefault('buildToolsVersion', "35.0.0")
    defaultConfig {
        minSdkVersion getExtOrDefault('minSdkVersion', 21)
        targetSdkVersion getExtOrDefault('targetSdkVersion', 35)
    }
    compileOptions {
        sourceCompatibility = '1.8'
        targetCompatibility = '1.8'
    }
}`;
    content = content.replace(androidRegex, newAndroidBlock);

    // Fix react-native dependency
    content = content.replace(
        /implementation ['"]com\.facebook\.react:react-native:[\d.]+(-rc\.\d+)?['"]/,
        "implementation 'com.facebook.react:react-native:+'"
    );

    fs.writeFileSync(gradlePath, content);
    console.log('✅ build.gradle patched');
}

// 2. Patch RfcommConnectorThreadImpl.java for aggressive channel-hopping fallback
const connectorPath = path.join(__dirname, '..', 'node_modules', 'react-native-bluetooth-classic', 'android', 'src', 'main', 'java', 'kjd', 'reactnative', 'bluetooth', 'conn', 'RfcommConnectorThreadImpl.java');

if (fs.existsSync(connectorPath)) {
    console.log('Patching RfcommConnectorThreadImpl.java...');
    let content = fs.readFileSync(connectorPath, 'utf8');

    // Add stabilization delay before the first connect if not present
    if (!content.includes("Thread.sleep(300)")) {
        content = content.replace(
            "mSocket.connect();",
            "try { Thread.sleep(300); } catch (Exception e) {} \n        mSocket.connect();"
        );
    }

    // Replace the entire connect method with a robust channel-hopping implementation
    const connectMethodRegex = /protected BluetoothSocket connect\(Properties properties\) throws IOException \{[\s\S]*?\n    \}/;
    const newConnectMethod = `protected BluetoothSocket connect(Properties properties) throws IOException {
        // Step 1: Attempt standard connection (UUID-based)
        try {
            try { Thread.sleep(800); } catch (Exception e) {}
            mSocket.connect();
            return mSocket;
        } catch (IOException e) {
            // Step 2: Aggressive Fallback - Try multiple RFCOMM channels via reflection.
            // This is often required for older/specialized SPP devices like POS machines.
            int[] channels = { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };
            for (int channel : channels) {
                try {
                    if (mSocket != null) { try { mSocket.close(); } catch (Exception ignored) {} }
                    try { Thread.sleep(500); } catch (Exception ignored) {}
                    
                    if (mSecure) {
                        mSocket = (BluetoothSocket) device.getClass().getMethod("createRfcommSocket", 
                            new Class[] {int.class}).invoke(device, channel);
                    } else {
                        mSocket = (BluetoothSocket) device.getClass().getMethod("createInsecureRfcommSocket", 
                            new Class[] {int.class}).invoke(device, channel);
                    }
                    mSocket.connect();
                    return mSocket; // Success!
                } catch (Exception e_chan) {
                    // Try next channel...
                }
            }
            // If all fallbacks fail, throw the original IOException
            throw e;
        }
    }`;

    content = content.replace(connectMethodRegex, newConnectMethod);
    fs.writeFileSync(connectorPath, content);
    console.log('✅ RfcommConnectorThreadImpl.java patched with channel-hopping');
}
