-- Seed catalogue médicaments (référentiel national simplifié) + alternatives.
-- À exécuter après les migrations 0024/0025.
-- Idempotent : TRUNCATE puis INSERT (catalogue global, pas de données tenant).

truncate table public.medication_alternatives restart identity cascade;
truncate table public.medications restart identity cascade;

with m as (
  insert into public.medications (dci, brand, class, form, dosage) values
  -- Antalgiques / fièvre
  ('Paracétamol','Doliprane','Antalgique','comprimé','500 mg'),
  ('Paracétamol','Doliprane','Antalgique','comprimé','1 g'),
  ('Paracétamol','Doliprane','Antalgique','sirop','100 mg/5 ml'),
  ('Ibuprofène','Advil','AINS','comprimé','400 mg'),
  ('Diclofénac','Voltarène','AINS','comprimé','50 mg'),
  ('Diclofénac','Voltarène','AINS','injectable','75 mg/3 ml'),
  ('Aspirine','Aspégic','AINS','comprimé','100 mg'),
  ('Tramadol','Topalgic','Antalgique opioïde','comprimé','50 mg'),
  ('Néfopam','Acupan','Antalgique','comprimé','20 mg'),
  -- Antibiotiques
  ('Amoxicilline','Clamoxyl','Pénicilline','comprimé','500 mg'),
  ('Amoxicilline','Clamoxyl','Pénicilline','sirop','250 mg/5 ml'),
  ('Amoxicilline–acide clavulanique','Augmentin','Pénicilline','comprimé','500/62.5 mg'),
  ('Ampicilline','Ampicilline','Pénicilline','injectable','1 g'),
  ('Céfalexine','Céphalexine','Céphalosporine','comprimé','500 mg'),
  ('Ceftriaxone','Rocephin','Céphalosporine','injectable','1 g'),
  ('Céfotaxime','Claforan','Céphalosporine','injectable','1 g'),
  ('Ciprofloxacine','Ciproxine','Fluoroquinolone','comprimé','500 mg'),
  ('Lévofloxacine','Tavanic','Fluoroquinolone','comprimé','500 mg'),
  ('Azithromycine','Zithromax','Macrolide','comprimé','250 mg'),
  ('Clarithromycine','Clarithromycine','Macrolide','comprimé','500 mg'),
  ('Érythromycine','Érythromycine','Macrolide','comprimé','500 mg'),
  ('Doxycycline','Doxycycline','Cycline','comprimé','100 mg'),
  ('Tétracycline','Tétracycline','Cycline','comprimé','500 mg'),
  ('Cotrimoxazole','Bactrim','Sulfamide','comprimé','400/80 mg'),
  ('Métronidazole','Flagyl','Nitro-imidazolé','comprimé','500 mg'),
  ('Métronidazole','Flagyl','Nitro-imidazolé','sirop','125 mg/5 ml'),
  ('Tinidazole','Tinidazole','Nitro-imidazolé','comprimé','500 mg'),
  ('Gentamicine','Gentalline','Aminoside','injectable','80 mg/2 ml'),
  ('Amikacine','Amikacine','Aminoside','injectable','500 mg'),
  ('Clindamycine','Clindamycine','Lincosamide','comprimé','300 mg'),
  ('Chloramphénicol','Chloramphénicol','Phénicol','collyre','1 %'),
  ('Nitrofurantoïne','Furadantine','Nitrofurane','comprimé','100 mg'),
  ('Fosfomycine','Monuril','Phosphonique','sachet','3 g'),
  -- Antipaludéens
  ('Artéméther–luméfantrine','Coartem','Antipaludéen ACT','comprimé','20/120 mg'),
  ('Artésunate','Arsumax','Antipaludéen','injectable','60 mg'),
  ('Artésunate–amodiaquine','ASAQ','Antipaludéen ACT','comprimé','100/270 mg'),
  ('Dihydroartémisinine–pipéraquine','Eurartesim','Antipaludéen ACT','comprimé','40/320 mg'),
  ('Quinine','Quinine','Antipaludéen','injectable','600 mg'),
  ('Sulfadoxine–pyriméthamine','Fansidar','Antipaludéen','comprimé','500/25 mg'),
  ('Primaquine','Primaquine','Antipaludéen','comprimé','15 mg'),
  ('Atovaquone–proguanil','Malarone','Antipaludéen','comprimé','250/100 mg'),
  ('Doxycycline','Doxycycline','Antipaludéen (prophylaxie)','comprimé','100 mg'),
  -- Antiparasitaires
  ('Albendazole','Zentel','Anthelminthique','comprimé','400 mg'),
  ('Mébendazole','Vermox','Anthelminthique','comprimé','100 mg'),
  ('Praziquantel','Biltricide','Antibilharzien','comprimé','600 mg'),
  ('Ivermectine','Mectizan','Antiparasitaire','comprimé','3 mg'),
  ('Métronidazole','Flagyl','Antiamibien','comprimé','500 mg'),
  -- TB / lèpre
  ('Rifampicine','Rifadine','Antituberculeux','comprimé','300 mg'),
  ('Isoniazide','Rimifon','Antituberculeux','comprimé','100 mg'),
  ('Pyrazinamide','Pyrazinamide','Antituberculeux','comprimé','500 mg'),
  ('Éthambutol','Myambutol','Antituberculeux','comprimé','400 mg'),
  ('Dapsone','Dapsone','Antilépreux','comprimé','100 mg'),
  ('Clofazimine','Lamprene','Antilépreux','gélule','50 mg'),
  -- VIH / hépatites
  ('Ténofovir','Viread','Antirétroviral','comprimé','300 mg'),
  ('Lamivudine','Épivir','Antirétroviral','comprimé','150 mg'),
  ('Dolutégravir','Tivicay','Antirétroviral','comprimé','50 mg'),
  ('Éfavirenz','Sustiva','Antirétroviral','comprimé','600 mg'),
  ('Abacavir','Ziagen','Antirétroviral','comprimé','300 mg'),
  ('Sofosbuvir','Sovaldi','Antihépatite C','comprimé','400 mg'),
  ('Daclatasvir','Daklinza','Antihépatite C','comprimé','60 mg'),
  -- Cardio
  ('Amlodipine','Amlor','Antihypertenseur','comprimé','5 mg'),
  ('Hydrochlorothiazide','Esidrex','Diurétique','comprimé','25 mg'),
  ('Énalapril','Renitec','IEC','comprimé','10 mg'),
  ('Captopril','Lopril','IEC','comprimé','25 mg'),
  ('Losartan','Cozaar','ARA2','comprimé','50 mg'),
  ('Aténolol','Ténormine','Bêtabloquant','comprimé','50 mg'),
  ('Bisoprolol','Cardensiel','Bêtabloquant','comprimé','5 mg'),
  ('Furosémide','Lasilix','Diurétique','comprimé','40 mg'),
  ('Spironolactone','Aldactone','Diurétique','comprimé','25 mg'),
  ('Simvastatine','Zocor','Statin','comprimé','20 mg'),
  ('Atorvastatine','Tahor','Statin','comprimé','20 mg'),
  ('Aspirine','Aspégic','Antiagrégant','comprimé','75 mg'),
  ('Clopidogrel','Plavix','Antiagrégant','comprimé','75 mg'),
  ('Warfarine','Coumadine','Anticoagulant','comprimé','5 mg'),
  ('Héparine','Héparine','Anticoagulant','injectable','5000 UI'),
  ('Digoxine','Digoxine','Cardiotonique','comprimé','0.25 mg'),
  ('Amiodarone','Cordarone','Antiarythmique','comprimé','200 mg'),
  -- Diabète
  ('Metformine','Glucophage','Antidiabétique','comprimé','500 mg'),
  ('Glibenclamide','Daonil','Sulfamide hypoglycémiant','comprimé','5 mg'),
  ('Gliclazide','Diamicron','Sulfamide hypoglycémiant','comprimé','80 mg'),
  ('Insuline NPH','Insulatard','Insuline','injectable','100 UI/ml'),
  ('Insuline rapide','Actrapid','Insuline','injectable','100 UI/ml'),
  -- Gastro
  ('Oméprazole','Mopral','IPP','gélule','20 mg'),
  ('Ésoméprazole','Inexium','IPP','comprimé','20 mg'),
  ('Pantoprazole','Eupantol','IPP','comprimé','40 mg'),
  ('Famotidine','Famotidine','Anti-H2','comprimé','40 mg'),
  ('Lactulose','Duphalac','Laxatif','sirop','10 g/15 ml'),
  ('Macrogol','Forlax','Laxatif','sachet','10 g'),
  ('Bisacodyl','Dulcolax','Laxatif','comprimé','5 mg'),
  ('Métoclopramide','Primpéran','Antiémétique','comprimé','10 mg'),
  ('Ondansétron','Zophren','Antiémétique','comprimé','4 mg'),
  ('Dompéridone','Motilium','Antiémétique','comprimé','10 mg'),
  -- Neuro / psy
  ('Phénobarbital','Gardénal','Antiépileptique','comprimé','100 mg'),
  ('Carbamazépine','Tégrétol','Antiépileptique','comprimé','200 mg'),
  ('Valproate','Dépakine','Antiépileptique','comprimé','500 mg'),
  ('Lévétiracétam','Keppra','Antiépileptique','comprimé','500 mg'),
  ('Diazépam','Valium','Benzodiazépine','comprimé','5 mg'),
  ('Lorazépam','Temesta','Benzodiazépine','comprimé','1 mg'),
  ('Amitriptyline','Laroxyl','Antidépresseur','comprimé','25 mg'),
  ('Fluoxétine','Prozac','Antidépresseur','gélule','20 mg'),
  ('Halopéridol','Haldol','Antipsychotique','comprimé','5 mg'),
  ('Chlorpromazine','Largactil','Antipsychotique','comprimé','100 mg'),
  ('Rispéridone','Risperdal','Antipsychotique','comprimé','2 mg'),
  -- Respiratoire
  ('Salbutamol','Ventoline','Bronchodilatateur','aérosol','100 µg'),
  ('Terbutaline','Bricanyl','Bronchodilatateur','comprimé','5 mg'),
  ('Béclométasone','Bécotide','Corticoïde inhalé','aérosol','250 µg'),
  ('Budésonide','Pulmicort','Corticoïde inhalé','aérosol','200 µg'),
  ('Ipratropium','Atrovent','Anticholinergique','aérosol','20 µg'),
  -- Dermato
  ('Bétaméthasone','Diprosone','Corticoïde','crème','0.05 %'),
  ('Hydrocortisone','Hydrocortisone','Corticoïde','crème','1 %'),
  ('Kétoconazole','Nizoral','Antifongique','comprimé','200 mg'),
  ('Clotrimazole','Canesten','Antifongique','crème','1 %'),
  ('Griseofulvine','Griseofulvine','Antifongique','comprimé','500 mg'),
  ('Terbinafine','Lamisil','Antifongique','comprimé','250 mg'),
  ('Perméthrine','Ascabiol','Scabicide','lotion','5 %'),
  ('Benzoate de benzyle','Ascabiol','Scabicide','lotion','25 %'),
  -- Gynéco
  ('Misoprostol','Cytotec','Utéotonique','comprimé','200 µg'),
  ('Ocytocine','Syntocinon','Utéotonique','injectable','5 UI/ml'),
  ('Magnésium sulfate','Magnésium','Anticonvulsivant','injectable','1 g/2 ml'),
  ('Lévonorgestrel','Norlevo','Contraception','comprimé','1.5 mg'),
  ('DMPA','Depo-Provera','Contraception','injectable','150 mg/ml'),
  ('Éthinylestradiol–lévonorgestrel','Minidril','Contraception','comprimé','30/150 µg'),
  -- Vitamines / autres
  ('Fer + acide folique','Ferrofol','Antianémique','comprimé','—'),
  ('Acide folique','Acide folique','Vitamine','comprimé','5 mg'),
  ('Vitamine A','Vitamine A','Vitamine','capsule','200000 UI'),
  ('Vitamine B12','Cyanocobalamine','Vitamine','comprimé','1000 µg'),
  ('Calcium + vitamine D','Calcidol','Supplément','comprimé','500 mg/400 UI'),
  ('Oméprazole','Mopral','IPP','gélule','20 mg'),
  ('Salbutamol','Ventoline','Bronchodilatateur','sirop','2 mg/5 ml'),
  -- Ophtalmo
  ('Timolol','Timoptol','Antiglaucomeux','collyre','0.5 %'),
  ('Latanoprost','Xalatan','Antiglaucomeux','collyre','0.005 %'),
  ('Ciprofloxacine','Ciloxan','Antibiotique ophtal','collyre','0.3 %'),
  ('Tobramycine','Tobrex','Antibiotique ophtal','collyre','0.3 %'),
  -- ORL
  ('Bétahistine','Serc','Antivertigineux','comprimé','8 mg'),
  ('Cétirizine','Zyrtec','Antihistaminique','comprimé','10 mg'),
  ('Loratadine','Clarityne','Antihistaminique','comprimé','10 mg'),
  ('Hydroxyzine','Atarax','Antihistaminique','comprimé','25 mg'),
  -- Rhumato
  ('Colchicine','Colchicine','Antigoutteux','comprimé','1 mg'),
  ('Allopurinol','Zyloric','Hypouricémiant','comprimé','100 mg'),
  ('Méthotrexate','Méthotrexate','DMARD','comprimé','2.5 mg'),
  ('Hydroxychloroquine','Plaquenil','DMARD','comprimé','200 mg'),
  -- Endocrino
  ('Lévothyroxine','Lévothyrox','Hormone thyroïdienne','comprimé','100 µg'),
  ('Carbimazole','Néo-Mercazole','Antithyroïdien','comprimé','5 mg'),
  ('Hydrocortisone','Hydrocortisone','Corticoïde systémique','comprimé','10 mg'),
  -- Uro
  ('Tamsulosine','Josir','Alpha-bloquant','gélule','0.4 mg'),
  ('Finastéride','Proscar','Inhibiteur 5-alpha','comprimé','5 mg'),
  ('Nitrofurantoïne','Furadantine','Antibiotique urinaire','comprimé','100 mg'),
  ('Sildénafil','Viagra','Vasodilatateur','comprimé','50 mg'),
  ('Oxybutynine','Ditropan','Anticholinergique','comprimé','5 mg'),
  -- Douleur neuropathique
  ('Gabapentine','Neurontin','Anticonvulsivant','gélule','300 mg'),
  ('Prégabaline','Lyrica','Anticonvulsivant','gélule','75 mg'),
  ('Duloxétine','Cymbalta','Antidépresseur','gélule','30 mg')
  returning id, dci
)
select 1;

-- Alternatives (quelques paires représentatives)
insert into public.medication_alternatives (medication_id, alternative_id, relation, note)
select a.id, b.id, 'same_class', null
from public.medications a join public.medications b on true
where false;

-- Exemples explicites d'alternatives
insert into public.medication_alternatives (medication_id, alternative_id, relation, note)
select x.id, y.id, 'same_class', 'Alternative même classe'
from (select id,dci from public.medications where dci='Ibuprofène' limit 1) x,
     (select id,dci from public.medications where dci='Diclofénac' limit 1) y
union all
select x.id, y.id, 'same_class', 'Alternative même classe'
from (select id from public.medications where dci='Amoxicilline' limit 1) x,
     (select id from public.medications where dci='Cotrimoxazole' limit 1) y
union all
select x.id, y.id, 'same_class', 'Alternative même classe'
from (select id from public.medications where dci='Oméprazole' limit 1) x,
     (select id from public.medications where dci='Pantoprazole' limit 1) y
union all
select x.id, y.id, 'same_class', 'Alternative même classe'
from (select id from public.medications where dci='Amlodipine' limit 1) x,
     (select id from public.medications where dci='Losartan' limit 1) y
union all
select x.id, y.id, 'same_class', 'Alternative même classe'
from (select id from public.medications where dci='Metformine' limit 1) x,
     (select id from public.medications where dci='Glibenclamide' limit 1) y;