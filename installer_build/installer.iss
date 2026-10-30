#define MyAppName "pyTOP Pro"
#define MyAppVersion "2.1-beta"
#define MyAppPublisher "pyTOP Pro"

[Setup]
AppId={{A14C06D9-3983-4CA1-8C6D-3F8A42E3159A}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\pyTOP Pro
DefaultGroupName=pyTOP Pro
UninstallDisplayName=pyTOP Pro
OutputDir=Output
OutputBaseFilename=pytop-v2.1-setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
Uninstallable=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "turkish"; MessagesFile: "compiler:Languages\Turkish.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Files]
Source: "..\app.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\alerts.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\database.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\docker_monitor.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\gpu_monitor.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\net_monitor.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\report_generator.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\sys_info.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\updater.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\requirements.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\.env.example"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\baslat.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\static\*"; DestDir: "{app}\static"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\templates\*"; DestDir: "{app}\templates"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\pyTOP Pro"; Filename: "{app}\baslat.bat"
Name: "{autodesktop}\pyTOP Pro"; Filename: "{app}\baslat.bat"; Tasks: desktopicon

[Run]
Filename: "{app}\baslat.bat"; Description: "Launch pyTOP Pro"; Flags: postinstall nowait skipifsilent shellexec
