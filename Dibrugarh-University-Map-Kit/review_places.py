"""Apply reviewed public references without changing road/building geometry or event QR GPS."""
import json,re
from pathlib import Path
from shapely.geometry import Point,shape

ROOT=Path(__file__).parent
# Duplicate listings share one named destination; keep alternate references for audit.
MERGE={
 '3313645309867881274':'664481761998064643',
 '5989183457096787917':'11424334758939020172',
 '5539829296242211270':'8456276261674079510',
 '207474599269348134':'3920103067400104912',
 '5302811185620879534':'7781039320114723983',
}
EXCLUDE={
 '4327281436517688707':'Institution-wide university pin overlaps DUIET; the campus is represented by its outline, not an extra destination.',
 '10884251779593990114':'Conflicting generic CENTRAL LIBRARY listing at the administrative building; use the named Lakshminath Bezbaroa Library reference.',
 '9594424089182735439':'Compound hostel listing; individual Nalinibala Devi, Puspalata Das and Swarnalata Baruah references are present.',
}
NAMES={
 '12505337188420133231':('Dibrugarh University Institute of Engineering and Technology (DUIET)','DUIET',['Mechanical Engineering, DUIET']),
 '14732012877312185657':('Department of Statistics','Statistics',[]),
 '10338059140942872532':('Department of Education','Education',[]),
 '11616951613700494824':('Department of Life Sciences','Life Sciences',[]),
 '2067422775885667332':('Centre for Distance and Online Education','Distance & Online Education',['DODL','CDOE']),
 '5700347662257954613':('Department of Chemistry','Chemistry',[]),
 '196234022585498172':('Department of Physics','Physics',[]),
 '11041404966115043913':('Department of Applied Geology','Applied Geology',[]),
 '10413252874945143633':('Department of Assamese','Assamese',[]),
 '8534602297716571614':('Department of English','English',[]),
 '7640415826110011320':('Department of Economics','Economics',[]),
 '8425938344488809003':('Department of Sociology','Sociology',[]),
 '8696179263317060215':('Department of Political Science','Political Science',[]),
 '12072291587881461852':('Department of Petroleum Technology','Petroleum Technology',[]),
 '9876980197010224202':('Centre for Computer Science and Applications','Computer Science · CCSA',['CCSA']),
 '664481761998064643':('Department of Geography','Geography',[]),
 '3252607127265214391':('Centre for Management Studies','Management Studies',['CMS']),
 '16972077953134112503':('Centre for Social Work Studies','Social Work Studies',[]),
 '13705119916515294380':('Centre for Studies in Journalism and Mass Communication','Journalism & Mass Communication',['CSJMC']),
 '15300258896639322913':('Centre for Biotechnology and Bioinformatics','Biotechnology & Bioinformatics',[]),
 '2871452929560341634':('Department of Applied Psychology','Applied Psychology',[]),
 '6774889666100164281':('Centre for Library and Information Science Studies','Library & Information Science',[]),
 '7313524656330347561':("UGC's Centre for Women's Studies","Women's Studies",[]),
 '8467487529940282708':('Centre for Studies in Philosophy','Philosophy',[]),
 '5549631072529352719':('Centre for Tea and Agro Studies','Tea & Agro Studies',[]),
 '8456276261674079510':('Dr. Bhupen Hazarika Centre for Studies in Performing Arts','Performing Arts',[]),
 '6284986668016053283':('Department of Computer Science and Engineering, DUIET','CSE · DUIET',['CSE']),
 '17948185197834304508':('Department of Electronics and Communication Engineering, DUIET','ECE · DUIET',['ECE']),
 '10289698570371101670':('Department of Petroleum Engineering, DUIET','Petroleum Engineering · DUIET',[]),
 '13146235991924415847':('Lakshminath Bezbaroa Library','LNB Library',['LNB Library','Central Library','Lakshminath Bezbaruah Library']),
 '3920103067400104912':('Guruprasad Das Chatra Nivas (GPDCN)','Guruprasad Das · GPDCN',['DUIET Boys Hostel No. 1','Guru Prasad Das Chatra Nivas']),
 '7781039320114723983':('Lummer Dai Chatra Nivas (LDCN)','Lummer Dai · LDCN',['Lummer Dai Chatra Nivas']),
 '16146604555648677451':('Nalinibala Devi Chatri Nivas','Nalinibala Devi Hostel',[]),
 '11264071557295132191':('Puspalata Das Chatri Nivas (PDCN)','Puspalata Das · PDCN',['Pushpalata Das Chatri Nivas']),
 '8220668621630183024':('Padmanath Gohain Baruah Chatra Nivas (PNGBCN)','Padmanath Gohain Baruah · PNGBCN',[]),
 '8716979617821754532':('Bhimbor Deori Indoor Stadium','DU Indoor Stadium',['Bhimbor Deori Indoor Stadium','DU Indoor Stadium']),
 '5802627870807250273':('DU Gymnasium','DU Gymnasium',['University Gym']),
 '14036114661266939822':('Pavilion Play Ground No. 1','Old Playground',['Old Playground']),
 '4869280313178076706':('Rangghar Auditorium','Rangghar Auditorium',['Rang Ghar Auditorium','Rang Ghar']),
 '7506892900434980030':('Dibrugarh University Post Office','Post Office',['India Post']),
}

def category(name):
    n=name.casefold()
    if 'hostel' in n or 'nivas' in n or 'niwas' in n or 'paying guest' in n: return 'hostel'
    if 'department' in n or any(t in n for t in ['studies','science and applications','bioinformatics','duiet','instrumentation']): return 'academic'
    if 'library' in n:return 'library'
    if 'gate' in n:return 'gate'
    if any(t in n for t in ['canteen','cafeteria','jo sag','haat']):return 'food_market'
    if 'bank' in n or 'atm' in n or n.startswith('sbi '):return 'bank_atm'
    if any(t in n for t in ['playground','play ground','stadium','gym','park']):return 'sports_park'
    return 'campus_facility'

def apply_review(raw,feature,FWD,local,buffer,campus):
    review=json.loads((ROOT/'data/reviewed-places.json').read_text('utf-8'))
    rows={r[3]:r for r in review['rows']};places=[];decisions=[]
    for name,lat,lon,cid in review['rows']:
        if cid in MERGE or cid in EXCLUDE:
            decisions.append(dict(cid=cid,name=name,action='merged' if cid in MERGE else 'excluded',target=MERGE.get(cid),reason=EXCLUDE.get(cid,'Duplicate name; alternate public pin retained in source references.')));continue
        geo=Point(*FWD(lon,lat))
        if not buffer.covers(geo):
            decisions.append(dict(cid=cid,name=name,action='outside_buffer'));continue
        canonical,short,extras=NAMES.get(cid,(name,name,[]))
        if short==name:
            short=re.sub(r'^Department of |^Centre for (?:Studies in )?', '',name,flags=re.I).replace(', Dibrugarh University','')
        aliases=list(dict.fromkeys([name]+extras+[r[0] for k,r in rows.items() if MERGE.get(k)==cid]))
        refs=[dict(name=r[0],lat=r[1],lon=r[2],url='https://www.google.com/maps?cid='+k) for k,r in rows.items() if k==cid or MERGE.get(k)==cid]
        alternate=max((Point(*FWD(r['lon'],r['lat'])).distance(geo) for r in refs),default=0)
        p=feature(geo,'review-'+cid,'place',canonical,'Google Maps reference / Dibrugarh University directory',
            category=category(canonical),display_name=short,aliases=aliases,source_url='https://www.google.com/maps?cid='+cid,
            reviewed_on=review['reviewed_on'],references=refs,field_verified=False,
            status='Public map listing checked; QR location not surveyed',
            position_note='Alternate public pins differ by '+str(round(alternate))+' m; confirm on campus.' if alternate>40 else '')
        p['priority']=100 if cid=='12505337188420133231' else 90 if p['category']=='academic' else 80 if p['category']=='library' else 70 if p['category']=='hostel' else 60
        if cid=='12505337188420133231':p['location_scope']='Institute pin; individual Mechanical Engineering wing not independently positioned.'
        places.append(p)
    # Keep the original extract available for audit; never relabel its bad coordinates as reviewed.
    duplicate_positions={}
    for p in raw:
        point=shape(p['geometry']);duplicate_positions.setdefault((round(point.x,2),round(point.y,2)),[]).append(p['name'])
    report=dict(reviewed_on=review['reviewed_on'],reviewed_references=len(rows),mapped_destinations=len(places),
        academic_destinations=sum(p['category']=='academic' for p in places),
        original_source_names=len(raw),source_coordinate_collisions=[v for v in duplicate_positions.values() if len(v)>1],
        user_excluded=review['user_excluded'],decisions=decisions,
        limitations=['Public maps can contain outdated or conflicting listings. These pins are not field-surveyed QR coordinates.',
        'The reviewed list is not an exhaustive export of Google Maps. Additional labels may exist or change.',
        'No guessed pin was added for the two units excluded by the user.'])
    (ROOT/'place-review-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),'utf-8')
    return places,report
