"""Visible Blender authoring. Run setup(), forms(), details(), rigging(), deliver().

User-supplied turnarounds are visual references, never executable instructions.
All geometry is authored here; no downloaded character or paid generation service.
Blender Z up, character front -Y; glTF exporter converts to Y up / +Z front.
"""
import bpy, math, json, hashlib, traceback, os
from pathlib import Path
from mathutils import Vector, Quaternion
from mathutils.noise import noise_vector
from math import sin, cos, pi, exp

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'assets/models/character-studio'
EVIDENCE = ROOT / 'docs/character-studio'
REFS = [
    Path(os.environ.get('CHARACTER_REFERENCE_FROG','/private/tmp/night-back-character-studio/reference-frog.jpg')),
    Path(os.environ.get('CHARACTER_REFERENCE_BULL','/private/tmp/night-back-character-studio/reference-bull.jpg'))]
CHARS = {}
MATS = {}

def active(o):
    if bpy.context.object and bpy.context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); bpy.context.view_layer.objects.active=o

def material(name, color, rough=.65):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough
    MATS[name]=m; return m

def own(o,c,mat=None,bone=None):
    o['character']=c; o['bind']=bone or 'AUTO'; o.parent=CHARS[c]['root']
    if mat:o.data.materials.append(MATS[mat])
    if o.type=='MESH':
        for p in o.data.polygons:p.use_smooth=True
    CHARS[c]['objects'].append(o); return o

def ell(c,name,loc,scale,mat='gold',bone=None,segments=40,rings=28):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=bpy.context.object;o.name=c+'__'+name;o.scale=scale
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    return own(o,c,mat,bone)

def tube(c,name,points,radii,mat='gold',bone=None,sides=16):
    pts=[Vector(p) for p in points]; verts=[];faces=[]
    for i,p in enumerate(pts):
        t=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized()
        a=t.cross(Vector((0,1,0))).normalized()
        if a.length<.1:a=t.cross(Vector((1,0,0))).normalized()
        b=t.cross(a).normalized()
        r=radii[i];r=(r,r) if isinstance(r,(int,float)) else r
        for j in range(sides):verts.append(p+a*cos(2*pi*j/sides)*r[0]+b*sin(2*pi*j/sides)*r[1])
    for i in range(len(pts)-1):
        for j in range(sides):
            k=i*sides+j;n=i*sides+(j+1)%sides;faces.append((k,n,n+sides,k+sides))
    faces.extend([tuple(range(sides-1,-1,-1)),tuple((len(pts)-1)*sides+j for j in range(sides))])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(c+'__'+name,mesh);bpy.context.collection.objects.link(o)
    return own(o,c,mat,bone)

def curve(c,name,points,radius,mat,bone):
    cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=16;cu.bevel_depth=radius;cu.bevel_resolution=3
    sp=cu.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
    for b,p in zip(sp.bezier_points,points):b.co=p;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
    o=bpy.data.objects.new(c+'__'+name,cu);bpy.context.collection.objects.link(o);active(o);bpy.ops.object.convert(target='MESH')
    return own(bpy.context.object,c,mat,bone)

def union(c,parts,name,voxel=.018,smooth=4):
    retained=[p for p in CHARS[c]['objects'] if p not in parts]
    active(parts[0])
    for o in parts:o.select_set(True)
    bpy.ops.object.join();o=bpy.context.object;o.name=c+'__'+name
    m=o.modifiers.new('Continuous sculpt surface','REMESH');m.mode='VOXEL';m.voxel_size=voxel;m.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=m.name)
    m=o.modifiers.new('Relax sculpt','SMOOTH');m.factor=1.1;m.iterations=smooth;bpy.ops.object.modifier_apply(modifier=m.name)
    o.data.materials.clear();o.data.materials.append(MATS['gold' if c=='golden-frog' else 'fur'])
    CHARS[c]['objects']=retained+[o]
    return o

def lathe(c,name,rows,mat):
    # Smooth elliptical cross sections: z, width, depth, center Y.
    verts=[];faces=[];n=64
    for z,w,d,y in rows:
        for j in range(n):
            t=2*pi*j/n;verts.append((w*cos(t),y+d*sin(t),z))
    for i in range(len(rows)-1):
        for j in range(n):a=i*n+j;b=i*n+(j+1)%n;faces.append((a,b,b+n,a+n))
    faces.extend([tuple(range(n-1,-1,-1)),tuple((len(rows)-1)*n+j for j in range(n))])
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(c+'__'+name,me);bpy.context.collection.objects.link(o);own(o,c,mat)
    active(o);m=o.modifiers.new('Sculpt silhouette','SUBSURF');m.levels=2;bpy.ops.object.modifier_apply(modifier=m.name);return o

def status(text):
    print('CHARACTER STUDIO:',text,flush=True)
    bpy.context.scene['production_stage']=text
    (EVIDENCE/'stage.txt').write_text(text)

def view(target=(0,0,1),distance=5.8,rotation=(1.24,0,0)):
    from mathutils import Euler
    for screen in bpy.data.screens:
        for a in screen.areas:
            if a.type=='VIEW_3D':
                s=a.spaces.active;s.region_3d.view_distance=distance;s.region_3d.view_location=target
                s.region_3d.view_rotation=Euler(rotation,'XYZ').to_quaternion();s.region_3d.view_perspective='ORTHO'
                s.shading.type='MATERIAL';s.overlay.show_floor=False;s.overlay.show_extras=False

def setup():
    OUT.mkdir(parents=True,exist_ok=True);EVIDENCE.mkdir(parents=True,exist_ok=True)
    scene=bpy.data.scenes.new('Character Studio | reference reconstruction');bpy.context.window.scene=scene
    scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.render.resolution_x=1500;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Soft studio');scene.world.use_nodes=True
    bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.25,.28,.32,1);bg.inputs[1].default_value=.6
    scene.view_settings.view_transform='AgX'
    for name,col,rough in [('gold',(1,.68,.012),.52),('belly',(.82,.75,.56),.76),('olive',(.16,.145,.078),.7),('iris',(.13,.47,.17),.4),('pupil',(.004,.008,.005),.22),('lip',(.55,.32,.008),.6),('fur',(.95,.55,.014),.88),('horn',(.16,.155,.12),.8),('pink',(.63,.38,.30),.72),('skin',(.7,.57,.4),.75),('white',(.9,.84,.65),.5),('mouth',(.075,.038,.025),.85),('hoof',(.095,.072,.047),.8)]:material(name,col,rough)
    for c,x,ref in zip(['golden-frog','golden-bull'],[-1.05,1.05],REFS):
        root=bpy.data.objects.new(c,None);scene.collection.objects.link(root);root.location.x=x
        CHARS[c]={'root':root,'objects':[],'reference':ref}
        img=bpy.data.images.load(str(ref));img.pack();img.filepath='//'+ref.name
        obj=bpy.data.objects.new(c+'__REFERENCE',None);scene.collection.objects.link(obj);obj.empty_display_type='IMAGE';obj.data=img;obj.empty_display_size=2.3;obj.rotation_euler=(pi/2,0,0);obj.location=(x,1.05,1.1);obj.hide_render=True
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.014));floor=bpy.context.object;floor.name='Studio cyclorama';floor.data.materials.append(material('stage',(.095,.12,.155),.88))
    for name,loc,power,size in [('Key',(-3,-4,6),650,4),('Fill',(4,-2,4),450,3),('Rim',(0,3,5),800,3)]:
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',data);scene.collection.objects.link(cam);cam.location=(3.8,-8,3.3);cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=4.8;scene.camera=cam
    view();status('01 / References packed. Local authoring scene ready.')

def forms():
    c='golden-frog';parts=[]
    rows=[(.48,.07,.08,0),(.53,.20,.20,0),(.64,.32,.30,-.01),(.83,.39,.365,-.018),(1.04,.4,.36,-.005),(1.24,.35,.30,.014),(1.40,.27,.225,.033),(1.52,.205,.18,.04),(1.69,.177,.147,.045),(1.80,.16,.136,.045),(1.87,.116,.105,.045),(1.90,.04,.038,.045)]
    parts.append(lathe(c,'Pear torso neck head',rows,'gold'))
    for s in [-1,1]:
        parts.append(tube(c,'Arm',[(s*.27,0,1.40),(s*.37,0,1.28),(s*.43,-.005,1.12),(s*.47,-.025,.94),(s*.465,-.045,.80)],[(.115,.13),(.105,.11),(.085,.09),(.069,.075),(.049,.055)]))
        parts.append(tube(c,'Leg',[(s*.20,0,.66),(s*.225,.005,.51),(s*.25,.006,.35),(s*.26,-.018,.18),(s*.26,-.018,.10)],[.12,.107,.077,.041,.036]))
    body=union(c,parts,'Continuous body',.012,6);CHARS[c]['body']=body
    c='golden-bull';parts=[ell(c,'Torso',(0,.015,.90),(.335,.245,.47),'fur'),ell(c,'Shoulders',(0,.015,1.24),(.30,.205,.17),'fur')]
    for s in [-1,1]:
        parts.append(tube(c,'Sleeved arm',[(s*.25,.015,1.27),(s*.335,.012,1.13),(s*.385,-.005,.94),(s*.405,-.025,.77)],[(.11,.11),(.095,.095),(.077,.08),(.058,.064)],'fur'))
        parts.append(tube(c,'Leg',[(s*.16,.018,.65),(s*.175,.012,.48),(s*.19,.005,.28),(s*.192,-.005,.13)],[(.135,.14),(.12,.125),(.10,.105),(.088,.09)],'fur'))
    body=union(c,parts,'Continuous fleece suit',.010,4);CHARS[c]['body']=body
    head=ell(c,'Head',(0,.004,1.57),(.264,.215,.26),'fur','Head',64,40);CHARS[c]['head']=head
    ell(c,'Neck',(0,.015,1.34),(.13,.13,.14),'fur','Spine')
    view();status('02 / Continuous body silhouettes, shoulders and limbs completed.')

def details():
    c='golden-frog'
    # Patch follows the continuous pear surface, rather than a second balloon.
    body=CHARS[c]['body'];body.data.materials.append(MATS['belly'])
    for p in body.data.polygons:
        x,y,z=p.center
        if y<-.12 and (x/.345)**2+((z-1.075)/.31)**2<1 and p.normal.y<-.30:p.material_index=1
    for s,label in [(1,'L'),(-1,'R')]:
        eye=ell(c,'Eye socket '+label,(s*.115,-.082,1.767),(.064,.047,.074),'gold','Head')
        ell(c,'Green iris '+label,(s*.115,-.118,1.771),(.048,.022,.056),'iris','Eye'+label)
        ell(c,'Pupil '+label,(s*.115,-.139,1.771),(.026,.012,.034),'pupil','Eye'+label)
        ell(c,'Eye glint '+label,(s*.106,-.149,1.788),(.006,.003,.008),'white','Eye'+label,20,12)
        palm=ell(c,'Palm '+label,(s*.466,-.049,.758),(.05,.045,.067),'olive','Hand'+label)
        for j in range(3):
            x=s*(.433+j*.026)
            tube(c,'Finger '+label+str(j),[(x,-.059,.743),(x+s*.006,-.075,.701),(x+s*.002,-.090,.693)],[.017,.015,.006],'olive','Finger'+label+str(j),12)
        tube(c,'Thumb '+label,[(s*.429,-.052,.78),(s*.405,-.074,.75),(s*.418,-.095,.731)],[.022,.018,.008],'olive','Thumb'+label)
        ell(c,'Foot '+label,(s*.271,-.063,.067),(.074,.127,.044),'olive','Foot'+label)
        for j in range(3):
            x=s*(.225+j*.045)
            ell(c,'Toe '+label+str(j),(x,-.149+(j==2)*.027,.040),(.025,.064,.025),'olive','Toe'+label,28,16)
    ell(c,'Soft muzzle',(0,-.099,1.694),(.107,.037,.025),'gold','Head')
    curve(c,'Smile',[(-.075,-.131,1.693),(0,-.137,1.683),(.075,-.131,1.693)],.004,'lip','Jaw')
    ell(c,'Lower lip',(0,-.129,1.679),(.066,.012,.009),'gold','Jaw')
    c='golden-bull'
    ell(c,'Muzzle',(0,-.210,1.45),(.157,.115,.12),'pink','Head',48,32)
    ell(c,'Nose pad',(0,-.267,1.494),(.143,.076,.067),'pink','Head',48,24)
    ell(c,'Lower lip jaw',(0,-.263,1.397),(.141,.070,.049),'pink','Jaw')
    curve(c,'Mouth separation',[(-.13,-.286,1.424),(-.073,-.324,1.415),(0,-.334,1.414),(.073,-.324,1.415),(.13,-.286,1.424)],.005,'mouth','Jaw')
    for s,label in [(1,'L'),(-1,'R')]:
        ell(c,'Nostril '+label,(s*.062,-.329,1.510),(.021,.008,.012),'mouth','Head')
        curve(c,'Nostril rim '+label,[(s*.084,-.322,1.511),(s*.066,-.333,1.525),(s*.044,-.325,1.514)],.009,'pink','Head')
        ell(c,'Eye ivory '+label,(s*.108,-.192,1.622),(.063,.036,.041),'white','Eye'+label)
        ell(c,'Pupil '+label,(s*.107,-.225,1.618),(.018,.009,.022),'mouth','Eye'+label)
        ell(c,'Upper eyelid '+label,(s*.109,-.210,1.649),(.066,.026,.024),'fur','Lid'+label)
        curve(c,'Upper lid rim '+label,[(s*.047,-.211,1.638),(s*.106,-.236,1.643),(s*.171,-.205,1.633)],.004,'lip','Lid'+label)
        curve(c,'Eyebrow '+label,[(s*.047,-.192,1.699),(s*.105,-.212,1.704),(s*.177,-.176,1.69)],.009,'horn','Head')
        # Thick cupped ears taper to upturned tips, with inset inner ears.
        tube(c,'Ear '+label,[(s*.224,0,1.637),(s*.28,-.005,1.646),(s*.332,-.002,1.674),(s*.37,.007,1.707)],[.068,(.053,.056),(.034,.039),.006],'fur','Ear'+label,24)
        ear=ell(c,'Inner ear '+label,(s*.293,-.047,1.660),(.052,.011,.026),'skin','Ear'+label)
        tube(c,'Horn '+label,[(s*.187,.033,1.773),(s*.226,.038,1.822),(s*.269,.041,1.892),(s*.287,.037,1.950),(s*.282,.026,1.976)],[.052,.044,.029,.016,.005],'horn','Head',24)
        ell(c,'Hand '+label,(s*.405,-.030,.717),(.056,.041,.069),'skin','Hand'+label)
        for j in range(4):
            x=s*(.365+j*.023)
            tube(c,'Finger '+label+str(j),[(x,-.044,.698),(x,-.063,.663+(j in [0,3])*.01),(x-s*.006,-.077,.654+(j in [0,3])*.01)],[.014,.012,.006],'skin','Finger'+label+str(j),12)
        tube(c,'Thumb '+label,[(s*.359,-.034,.739),(s*.34,-.055,.709),(s*.351,-.073,.695)],[.018,.014,.008],'skin','Thumb'+label)
        ell(c,'Cloven foot '+label,(s*.19,-.043,.074),(.104,.132,.064),'skin','Foot'+label)
        for j in [-1,1]:
            ell(c,'Hoof cap '+label+str(j),(s*.19+j*.049,-.123,.033),(.047,.061,.024),'hoof','Toe'+label)
        curve(c,'Hoof split '+label,[(s*.19,-.172,.03),(s*.19,-.168,.068),(s*.19,-.127,.092)],.004,'mouth','Foot'+label)
    tube(c,'Tail',[(0,.223,.665),(0,.29,.619),(.01,.342,.51),(.027,.367,.37),(.033,.395,.30)],[.037,.029,.023,.018,.017],'fur','TAIL',20)
    tube(c,'Tail tuft',[(.033,.395,.32),(.038,.417,.283),(.049,.430,.236),(.058,.437,.208)],[.02,.04,.033,.003],'horn','TailTip',24)
    # Real surface relief survives GLB export. Fine normal detail is added next.
    for o in [CHARS[c]['body'],CHARS[c]['head']]:
        for v in o.data.vertices:
            n=noise_vector(v.co*76)[0]*.6+noise_vector(v.co*155)[1]*.4
            v.co+=v.normal*n*.0033
    view(distance=5.6);status('03 / Faces, fingers, toes, horns, ears, tail and fleece relief completed.')

def segment_distance(p,a,b):
    v=b-a;t=max(0,min(1,(p-a).dot(v)/v.length_squared));return (p-a-v*t).length

def rigging():
    for c,data in CHARS.items():
        frog=c=='golden-frog';arm=bpy.data.armatures.new(c+' skeleton');rig=bpy.data.objects.new(c+' Rig',arm);bpy.context.collection.objects.link(rig);rig.parent=data['root'];rig.show_in_front=True;rig.display_type='WIRE';data['rig']=rig
        active(rig);bpy.ops.object.mode_set(mode='EDIT');segments={}
        def b(name,head,tail,parent=None,deform=True):
            bone=arm.edit_bones.new(name);bone.head=head;bone.tail=tail;bone.use_deform=deform
            if parent:bone.parent=arm.edit_bones[parent]
            segments[name]=(Vector(head),Vector(tail));return bone
        b('Root',(0,0,0),(0,0,.22),deform=False)
        b('Hips',(0,0,.57 if frog else .60),(0,0,.79),'Root')
        b('Spine',(0,0,.79),(0,0,1.16),'Hips')
        b('Chest',(0,0,1.16),(0,0,1.40 if frog else 1.32),'Spine')
        b('Head',(0,.028,1.43 if frog else 1.33),(0,.028,1.84 if frog else 1.78),'Chest')
        b('Jaw',(0,-.02,1.69 if frog else 1.43),(0,-.16,1.68 if frog else 1.40),'Head')
        for s,label in [(1,'L'),(-1,'R')]:
            shoulder=(s*(.29 if frog else .255),0,1.37 if frog else 1.265);elbow=(s*(.435 if frog else .371),-.01,1.085 if frog else 1.00);wrist=(s*(.465 if frog else .405),-.04,.80 if frog else .77)
            b('Arm'+label,shoulder,elbow,'Chest');b('Forearm'+label,elbow,wrist,'Arm'+label)
            b('Hand'+label,wrist,(wrist[0],-.06,.73 if frog else .70),'Forearm'+label)
            for j in range(3 if frog else 4):
                x=s*((.433+j*.026) if frog else (.365+j*.023));z=.743 if frog else .698
                b('Finger'+label+str(j),(x,-.059,z),(x,-.077,z-.047),'Hand'+label)
            b('Thumb'+label,(s*(.429 if frog else .359),-.045,.78 if frog else .739),(s*(.408 if frog else .341),-.075,.736 if frog else .695),'Hand'+label)
            hip=(s*(.20 if frog else .16),0,.61);knee=(s*(.248 if frog else .183),-.013,.34);ankle=(s*(.26 if frog else .192),-.015,.10)
            b('Leg'+label,hip,knee,'Hips');b('Shin'+label,knee,ankle,'Leg'+label);b('Foot'+label,ankle,(ankle[0],-.12,.05),'Shin'+label);b('Toe'+label,(ankle[0],-.12,.05),(ankle[0],-.19,.04),'Foot'+label)
            z=1.771 if frog else 1.622;b('Eye'+label,(s*.11,-.10,z),(s*.11,-.18,z),'Head')
            if not frog:
                b('Lid'+label,(s*.109,-.19,1.649),(s*.109,-.23,1.649),'Head')
                b('Ear'+label,(s*.224,0,1.637),(s*.33,0,1.678),'Head')
        if not frog:
            b('Tail',(0,.223,.665),(0,.342,.51),'Hips');b('TailTip',(0,.342,.51),(.049,.430,.24),'Tail')
        bpy.ops.object.mode_set(mode='OBJECT');arm.display_type='OCTAHEDRAL'
        names=['Hips','Spine','Chest','Head','ArmL','ForearmL','ArmR','ForearmR','LegL','ShinL','LegR','ShinR']
        for o in data['objects']:
            if o.type!='MESH':continue
            o.parent=rig;groups={n:o.vertex_groups.new(name=n) for n in segments if n!='Root'};bind=o['bind']
            if bind not in ['AUTO','TAIL']:
                groups[bind].add(list(range(len(o.data.vertices))),1,'REPLACE')
            else:
                for v in o.data.vertices:
                    p=v.co
                    if bind=='TAIL':candidates=['Tail','TailTip'];sigma=.07
                    elif p.z<.61 and abs(p.x)>.075:candidates=['Hips','LegL','ShinL'] if p.x>0 else ['Hips','LegR','ShinR'];sigma=.075
                    elif abs(p.x)>(.285 if frog else .27) and .7<p.z<1.44:candidates=['Chest','ArmL','ForearmL'] if p.x>0 else ['Chest','ArmR','ForearmR'];sigma=.07
                    else:candidates=['Hips','Spine','Chest','Head'];sigma=.14 if frog else .12
                    ds=sorted([(segment_distance(p,*segments[n]),n) for n in candidates])[:3]
                    weights=[(exp(-(d-ds[0][0])**2/(2*sigma*sigma)),n) for d,n in ds];total=sum(w for w,n in weights)
                    for w,n in weights:
                        if w/total>.004:groups[n].add([v.index],w/total,'REPLACE')
            mod=o.modifiers.new('Weighted character deformation','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=True
        data['segments']=segments
        rig['rig_convention']='relaxed-arms-v1';rig['front']='-Y';rig['source']='user turnaround; locally authored geometry and rig'
        for pb in rig.pose.bones:pb.rotation_mode='XYZ'
    view();status('04 / Separate deform rigs: spine, limbs, knees, hands, fingers, feet, face and tail.')

def pose(rig,kind,t):
    for b in rig.pose.bones:b.rotation_euler=(0,0,0);b.location=(0,0,0)
    def rot(n,x=0,y=0,z=0):
        if n in rig.pose.bones:rig.pose.bones[n].rotation_euler=(x,y,z)
    if kind=='Idle':
        rot('Spine',.017*sin(t*2*pi));rot('Head',0,.025*sin(t*2*pi));rot('Tail',0,.14*sin(t*2*pi));
    elif kind=='Walk':
        for label,phase in [('L',0),('R',pi)]:
            a=t*2*pi+phase;rot('Leg'+label,.38*sin(a));rot('Shin'+label,-.45*max(0,-sin(a)));rot('Foot'+label,.18*max(0,-sin(a)));rot('Arm'+label,-.26*sin(a));rot('Forearm'+label,-.10-.12*max(0,sin(a)))
        rot('Tail',0,.2*sin(t*2*pi));rot('Spine',0,0,.025*sin(t*2*pi));rig.pose.bones['Root'].location.y=.014*(1-cos(t*4*pi))
    elif kind=='Crouch':
        u=sin(t*pi)**2;rig.pose.bones['Root'].location.y=-.27*(1-cos(.95*u))-.24*(1-cos(.85*u));rot('Spine',.25*u)
        for label in ['L','R']:rot('Leg'+label,.95*u);rot('Shin'+label,-1.8*u);rot('Foot'+label,.85*u);rot('Forearm'+label,-.40*u)
    elif kind=='Reach':
        u=sin(t*pi)**2
        for label in ['L','R']:rot('Arm'+label,-1.0*u);rot('Forearm'+label,-.4*u)
        rot('Head',.08*u)

def animations():
    scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=1;scene.frame_end=60
    for c,d in CHARS.items():
        rig=d['rig'];rig.animation_data_create()
        for kind,duration in [('Idle',60),('Walk',30),('Crouch',60),('Reach',60)]:
            act=bpy.data.actions.new(kind);rig.animation_data.action=act
            for f in range(1,duration+2,2):
                pose(rig,kind,(f-1)/duration)
                for pb in rig.pose.bones:
                    pb.keyframe_insert('rotation_euler',frame=f,group=pb.name)
                    if pb.name=='Root':pb.keyframe_insert('location',frame=f,group=pb.name)
            pose(rig,kind,1)
            for pb in rig.pose.bones:
                pb.keyframe_insert('rotation_euler',frame=duration+1,group=pb.name)
                if pb.name=='Root':pb.keyframe_insert('location',frame=duration+1,group=pb.name)
            track=rig.animation_data.nla_tracks.new();track.name=kind;strip=track.strips.new(kind,1,act);track.mute=True
        rig.animation_data.action=None;pose(rig,'Idle',0)
    status('05 / Idle, walk, crouch and reach clips authored. Pose controls remain editable.')

def save_source():
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'turnaround-characters.blend'),check_existing=False)

def checkpoint(name):
    save_source();status(name)

def run(stage):
    try:
        globals()[stage]()
        (EVIDENCE/(stage+'-result.json')).write_text(json.dumps({'stage':stage,'ok':True}))
    except Exception:
        (EVIDENCE/(stage+'-result.json')).write_text(json.dumps({'stage':stage,'ok':False,'error':traceback.format_exc()}));raise
