const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'node_modules', 'react-native-bluetooth-classic', 'android', 'build.gradle');

if (fs.existsSync(filePath)) {
    console.log('Final refinement for react-native-bluetooth-classic/android/build.gradle...');
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Clean the header: Remove everything before 'apply plugin'
    const pluginLine = "apply plugin: 'com.android.library'";
    const pluginIndex = content.indexOf(pluginLine);
    if (pluginIndex > -1) {
        content = content.substring(pluginIndex);
    }

    // 2. Fix/Add the android block with namespace and forced SDK versions
    // We'll replace the existing android { ... } block entirely to be sure
    const androidRegex = /android \{[\s\S]*?\n\}/;
    const newAndroidBlock = `android {
    namespace "kjd.reactnative.bluetooth"
    
    compileSdkVersion getExtOrDefault('compileSdkVersion', 35)
    buildToolsVersion getExtOrDefault('buildToolsVersion', "35.0.0")

    defaultConfig {
        minSdkVersion getExtOrDefault('minSdkVersion', 21)
        targetSdkVersion getExtOrDefault('targetSdkVersion', 35)
        versionCode 1
        versionName "1.0"
    }
    lintOptions {
        abortOnError false
    }
    compileOptions {
        sourceCompatibility = '1.8'
        targetCompatibility = '1.8'
    }
    sourceSets { main { java.srcDirs = ['src/main/java', 'src/main/tests'] } }

    testOptions {
        unitTests.returnDefaultValues = true
    }
}`;

    content = content.replace(androidRegex, newAndroidBlock);

    // 3. Fix hardcoded react-native dependency
    content = content.replace(
        /implementation 'com\.facebook\.react:react-native:[\d.]+(-rc\.\d+)?'/,
        "implementation 'com.facebook.react:react-native:+'"
    );

    fs.writeFileSync(filePath, content);
    console.log('✅ Final patch successfully applied');
} else {
    console.log('⚠️ react-native-bluetooth-classic build.gradle not found');
}
