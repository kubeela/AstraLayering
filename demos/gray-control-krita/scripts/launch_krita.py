"""Launch an isolated Krita session with a one-shot importer plugin.

No application preferences, plugins or documents in a user's own session are
changed. The AppImage/executable is supplied by the caller, not installed here.
"""
import argparse
import os
from pathlib import Path
import subprocess

HERE=Path(__file__).resolve().parent
ap=argparse.ArgumentParser()
ap.add_argument('--krita',type=Path,required=True)
ap.add_argument('--output',type=Path,required=True)
ap.add_argument('--profile',type=Path,default=HERE.parent/'work/krita-profile')
ap.add_argument('--display',default=':119')
ap.add_argument('--script',type=Path,default=HERE/'krita_import.py',
                help='One-shot script to run inside Krita (import or targeted retouch).')
args=ap.parse_args()
profile=args.profile.resolve()
plugin=profile/'data/krita/pykrita/astra_import'
plugin.mkdir(parents=True,exist_ok=True)
(profile/'config').mkdir(exist_ok=True)
(plugin.parent/'astra_import.desktop').write_text('''[Desktop Entry]
Type=Service
ServiceTypes=Krita/PythonPlugin
X-KDE-Library=astra_import
X-Python-2-Compatible=false
Name=Astra character import
Comment=Build complete semantic character paint layers
''')
(plugin/'__init__.py').write_text('''from krita import Krita, Extension
import os
from pathlib import Path
class AstraImport(Extension):
    def setup(self):
        code=Path(os.environ['ASTRA_IMPORT_SCRIPT']).read_text()
        exec(compile(code,os.environ['ASTRA_IMPORT_SCRIPT'],'exec'),{})
    def createActions(self,window):
        pass
Krita.instance().addExtension(AstraImport(Krita.instance()))
''')
(profile/'config/kritarc').write_text('''[python]
enable_astra_import=true

[KisMainWindow]
Width=1800
Height=1200
''')
env=dict(os.environ,DISPLAY=args.display,XDG_CONFIG_HOME=str(profile/'config'),
         XDG_DATA_HOME=str(profile/'data'),ASTRA_DELIVERY_DIR=str(args.output.resolve()),
         ASTRA_IMPORT_SCRIPT=str(args.script.resolve()),FONTCONFIG_FILE='/etc/fonts/fonts.conf')
appdir=args.krita.resolve().parent
if (appdir/'usr/lib/krita-python-libs').is_dir():
    env['PYTHONHOME']=str(appdir/'usr')
    env['PYTHONPATH']=str(appdir/'usr/lib/krita-python-libs')
raise SystemExit(subprocess.call([str(args.krita.resolve()),'--nosplash'],env=env))
