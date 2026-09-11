"""Launch with Blender --python live_session.py (without --background).
Processes named local production stages while Blender's UI remains responsive.
"""
import bpy, runpy, json, traceback
from pathlib import Path
HERE=Path(__file__).resolve().parent
QUEUE=Path('/private/tmp/night-back-character-studio/command.json')
RESULT=Path('/private/tmp/night-back-character-studio/response.json')
studio=runpy.run_path(str(HERE/'build_characters.py'))
last=None
def tick():
    global last
    if QUEUE.exists():
        command=json.loads(QUEUE.read_text())
        if command['id']!=last:
            last=command['id']
            try:
                stage=command['stage']
                if stage=='extension':
                    exec((HERE/'finish_characters.py').read_text(),studio['run'].__globals__)
                else:studio['run'](stage)
                RESULT.write_text(json.dumps({'id':last,'stage':stage,'ok':True}))
            except Exception:
                RESULT.write_text(json.dumps({'id':last,'ok':False,'error':traceback.format_exc()}))
    return .5
bpy.app.timers.register(tick,first_interval=2)
