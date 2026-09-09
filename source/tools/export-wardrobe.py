import bpy,math,json,os
from mathutils import Vector
import sys
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:]
number=int(args[0]);root=Path(args[1]);src=str(root/'PEAK Characters/1. Source/PEAK Characters fin.blend')
out=str(Path(__file__).resolve().parents[2]/'assets/models')
os.makedirs(out,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=src,load_ui=False,use_scripts=False)
keep=({1:['BODY.001','CLOTHES.001','HEAD.001','Crab HEAD','Belt.002','Scarf'],2:['BODY.002','CLOTHES.002','HEAD.002','ChefCAp','Belt.001','ch3 Scarft 1','ch3 Scarft 2']})[number]
for o in list(bpy.data.objects):
 if o.name not in keep:bpy.data.objects.remove(o,do_unlink=True)
for im in bpy.data.images:
 if im.name.startswith('ch'):
  im.filepath=str(root/'textures'/im.name)
  im.reload()
  if max(im.size)>1024:im.scale(1024,1024)
# 把原附件的物件放到共同原点；保留 UV 和作者贴图。
cx=-.03 if number==1 else -3.996;front=-1
for o in list(bpy.data.objects):
 if o.type!='MESH':continue
 for v in o.data.vertices:v.co=o.matrix_world @ v.co-Vector((cx,0,0))
 o.matrix_world.identity()
 if o.name in ['Crab HEAD','ChefCAp']:
  mod=o.modifiers.new('Browser reduction','DECIMATE');mod.ratio=.06 if o.name=='Crab HEAD' else .18
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 for poly in o.data.polygons:poly.use_smooth=False
# 轻量绑定：头、躯干、四肢；没有假称附件带有动画。
arm=bpy.data.armatures.new('NightRig');rig=bpy.data.objects.new('NightRig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
 b=arm.edit_bones.new(name);b.head=head;b.tail=tail
 if parent:b.parent=arm.edit_bones[parent]
 return b
bone('Root',(0,0,0),(0,0,.4))
bone('Spine',(0,0,1.6),(0,0,2.8),'Root')
bone('Head',(0,0,2.8),(0,0,4.5),'Spine')
for s,sign in [('L',1),('R',-1)]:
 bone('Arm'+s,(sign*.62,0,2.64),(sign*1.85,0,1.65),'Spine')
 bone('Leg'+s,(sign*.38,0,1.7),(sign*.40,0,.13),'Root')
bpy.ops.object.mode_set(mode='OBJECT')
for o in list(bpy.data.objects):
 if o.type!='MESH':continue
 groups={n:o.vertex_groups.new(name=n) for n in ['Spine','Head','ArmL','ArmR','LegL','LegR']}
 for v in o.data.vertices:
  x,y,z=v.co
  if o.name.startswith('HEAD') or o.name in ['Crab HEAD','ChefCAp']:name='Head'
  elif o.name.startswith(('Scarf','Scarft','Belt','ch3 Scarft')):name='Spine'
  elif z<1.64:name='LegL' if x>0 else 'LegR'
  elif abs(x)>.66 and z>1.3:name='ArmL' if x>0 else 'ArmR'
  else:name='Spine'
  groups[name].add([v.index],1,'REPLACE')
 o.parent=rig;mod=o.modifiers.new('Night rig','ARMATURE');mod.object=rig
# 统一高度、原点；GLTF 自动转为 Y 轴向上。
rig.scale=(.34,.34,.34)
for o in bpy.context.scene.objects:o.select_set(o.type in ['MESH','ARMATURE'])
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=out+f'/peak-character-{number}.glb',export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_materials='EXPORT')
report={'source':'User supplied peak-characters.zip','selected':f'Character {number}','inputContainsRig':False,'inputContainsAnimations':False,'changes':['resolved image paths','textures limited to 1024','head accessory reduced for browser runtime','simple six-bone rig added'],'meshes':[{'name':o.name,'vertices':len(o.data.vertices)} for o in bpy.data.objects if o.type=='MESH']}
open(out+f'/character-{number}-provenance.json','w').write(json.dumps(report,ensure_ascii=False,indent=2))
