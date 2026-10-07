'use strict';
const {VERSION:INTERPRETER}=require('../../pseudocode-engine');
const {TASKS:LEGACY}=require('./pseudocodeLegacyTasks');
const VERSION='2026-10-07.2', TASKS=[];
const categories=['Selection','Iteration','Strings','Arrays','Files'];
const replacement='RecallStride replacement practice data: the worksheet’s school starter link requires sign-in.';
function add(section,n,title,prompt,solution,rows,options={}){
 const id=`worksheet-${section}-${String(n).replace('.','-')}`;
 const cases=rows.map(([label,inputs,expected,extra={}],i)=>({id:`case-${i+1}`,label,inputs,expected:expected.map(String),...extra}));
 const t={id,category:categories[section-1],worksheet:`${section}.${n}`,topicId:'cs-2-2-1',componentId:'component-2',objectives:[categories[section-1].toLowerCase()],title,kind:options.kind||'Write a program',difficulty:options.extension?'Challenge':'Core',minutes:options.extension?25:10,prompt,expectedBehaviour:prompt,planPrompt:'Identify inputs, processing, outputs and one boundary case.',starter:(options.setup||'')+`\n// ${title}\n// Write your solution below.\n`,example:{inputs:cases[0].inputs,output:cases[0].expected},cases,solutions:[solution],mutations:[],hints:options.hints||['Separate input, processing and output.','Trace the example by hand and check index or loop boundaries.','Compare your output wording and line breaks with the example.'],rubric:['I can explain how my algorithm meets the task.','I checked a boundary as well as the example.'],misconceptions:[],transferId:id,version:VERSION,interpreterVersion:INTERPRETER,comparison:options.comparison||{kind:'exact',whitespace:'Match text and line breaks exactly'},files:options.files||{},fixtureNote:options.fixtureNote||'',provenance:{origin:'Adapted from user-supplied CodingTasks worksheets',author:'Andrew O’Hara; RecallStride adaptation',lastRevised:'2026-10-07',independentReviewer:null}};
 TASKS.push(t);return t;
}
const list=(...v)=>v.map(String);
const range=n=>Array.from({length:n},(_,i)=>i);
add(1,1,'Grade my test','Read a letter grade, ignoring case. A/B: Well Done. C: Room for Improvement. Any other grade: Try Harder.',`grade=input("Grade").upper
if grade=="A" OR grade=="B" then
 print("Well Done")
elseif grade=="C" then
 print("Room for Improvement")
else
 print("Try Harder")
endif`,[['A',['A'],['Well Done']],['B',['b'],['Well Done']],['C',['C'],['Room for Improvement']],['Other',['E'],['Try Harder']]],{setup:'grade=input("Grade")'});
add(1,2,'Percentage grades','Read a percentage (0–100). Print Distinction at 85+, Merit at 65–84, Pass at 40–64, otherwise Fail.',`mark=int(input("Percentage"))
if mark>=85 then
 print("Distinction")
elseif mark>=65 then
 print("Merit")
elseif mark>=40 then
 print("Pass")
else
 print("Fail")
endif`,[0,39,40,64,65,84,85,100].map(n=>[`${n}%`,[String(n)],[n>=85?'Distinction':n>=65?'Merit':n>=40?'Pass':'Fail']]));
const compare=`a=int(input("A"))
b=int(input("B"))
if a<b then
 print("A is less than B")
elseif a>b then
 print("A is more than B")
else
 print("Both numbers are the same!")
endif`;
const comparisons=[['Less',['2','9'],['A is less than B']],['More',['10','3'],['A is more than B']],['Equal',['0','0'],['Both numbers are the same!']]];
add(1,3,'More or less','Read whole numbers A and B. Print the comparison sentence shown in the tests.',compare,comparisons);
add(1,4,'Ticket booking','Read tier (Lower/Upper), then age. Lower costs £5 under 16, £10 over 65, otherwise £20. Upper adds £5. Print £ followed by the price. Ages 16 and 65 pay the standard price.',`tier=input("Tier").lower
age=int(input("Age"))
price=20
if age<16 then
 price=5
elseif age>65 then
 price=10
endif
if tier=="upper" then
 price=price+5
endif
print("£"+str(price))`,[['Lower',10,5],['Upper',11,10],['Lower',88,10],['Lower',45,20],['Upper',66,15],['Upper',34,25],['Lower',16,20],['Lower',65,20]].map(([t,a,p])=>[`${t}, age ${a}`,[t,String(a)],[`£${p}`]]));
add(1,5,'Cat or dog boarding','Read pet type, package, then days. Base rate £20/day. Cat Gold and dog Platinum add 25%; cat Silver and dog Gold use the base rate. Print the total with £.',`pet=input("Pet").lower
package=input("Package").lower
days=int(input("Days"))
rate=20
if (pet=="cat" AND package=="gold") OR (pet=="dog" AND package=="platinum") then
 rate=25
endif
print("£"+str(rate*days))`,[['cat','Gold',250],['cat','Silver',200],['dog','Platinum',250],['dog','Gold',200]].map(([p,k,c])=>[`${p} ${k}`,[p,k,'10'],[`£${c}`]]));
add(1,6,'Taxi fares','Read passengers, then miles. Fare is £6/mile. For trips over 5 miles, discount 10% for 4+ people or 5% for 2–3. Otherwise no discount. Print the sentence shown.',`people=int(input("Passengers"))
miles=int(input("Miles"))
fare=miles*6
if miles>5 then
 if people>=4 then
  fare=fare*0.9
 elseif people>=2 then
  fare=fare*0.95
 endif
endif
print("The "+str(miles)+"-mile journey, for "+str(people)+" people, will be £"+str(round(fare,2)))`,[['3','10',57],['4','10',54],['4','5',30],['1','10',60]].map(([p,m,c])=>[`${p} people, ${m} miles`,[p,m],[`The ${m}-mile journey, for ${p} people, will be £${c}`]]));
add(1,7,'Grade my test with CASE','Solve Grade my test using switch/case. Accept upper or lower case.',`grade=input("Grade").upper
switch grade:
 case "A": print("Well Done")
 case "B": print("Well Done")
 case "C": print("Room for Improvement")
 default: print("Try Harder")
endswitch`,[['A',['a'],['Well Done']],['B',['B'],['Well Done']],['C',['C'],['Room for Improvement']],['Other',['D'],['Try Harder']]],{hints:['Start with switch grade:; finish with endswitch.','Each case has its own branch; cases do not fall through.','Use default: for other grades.']});
add(1,8,'More or less with CASE','Read A and B; solve More or less using switch true: and Boolean cases.',`a=int(input("A"))
b=int(input("B"))
switch true:
 case a<b: print("A is less than B")
 case a>b: print("A is more than B")
 default: print("Both numbers are the same!")
endswitch`,comparisons);
add(1,9,'Parcel pricing','Read weight (kg) then volume (m3). If weight <4 AND volume <0.3, charge £5. Otherwise charge the larger of weight × £2 and volume × £20. Print the sentence shown.',`weight=float(input("Weight (kg)"))
volume=float(input("Volume (m3)"))
price=5
if weight>=4 OR volume>=0.3 then
 price=max(weight*2,volume*20)
endif
print("Thank you for using our service to send a parcel weighing "+str(weight)+"kg, with a volume of "+str(volume)+"m3. The total cost for your delivery will be £"+str(price))`,[[2.5,.1,5],[6,.2,12],[6,.8,16],[4,.1,8]].map(([w,v,p])=>[`${w}kg, ${v}m3`,[String(w),String(v)],[`Thank you for using our service to send a parcel weighing ${w}kg, with a volume of ${v}m3. The total cost for your delivery will be £${p}`]]),{extension:true});
add(1,10,'Stopping distance','Read speed (mph) then road (dry/wet/icy). Convert to m/s: speed ÷ 2.237. Reaction distance = speed × 1.5. Braking distance = speed² ÷ (2 × friction × 9.81). Friction: dry 0.7, wet 0.5, icy 0.3. Round the total to the nearest metre; print “33 meters” style. A classroom calculation.',`speed=float(input("Speed (mph)"))/2.237
road=input("Road").lower
friction=0.7
if road=="wet" then
 friction=0.5
elseif road=="icy" then
 friction=0.3
endif
print(str(round(speed*1.5+speed^2/(2*friction*9.81)))+" meters")`,[['Dry',['30','dry'],['33 meters']],['Wet',['70','wet'],['147 meters']],['Icy',['30','icy'],['51 meters']],['Stationary',['0','dry'],['0 meters']]],{extension:true});
add(2,1,'Count with WHILE','Use a while loop to print every integer from 0 to 10 inclusive, one per line.',`n=0
while n<=10
 print(n)
 n=n+1
endwhile`,[['0–10',[],list(...range(11))]]);
add(2,2,'Rocket countdown','Count down from 10 to 1: “10 seconds”, etc., but “1 second”. Finish with Rocket Launched!.',`for n=10 to 1 step -1
 if n==1 then
  print("1 second")
 else
  print(str(n)+" seconds")
 endif
next n
print("Rocket Launched!")`,[['Launch',[],[...range(9).map(i=>`${10-i} seconds`),'1 second','Rocket Launched!']]]);
add(2,3,'Even numbers with FOR','Use a for loop with step 2 to print 2, 4, 6, 8 and 10.',`for n=2 to 10 step 2
 print(n)
next n`,[['Even numbers',[],list(2,4,6,8,10)]]);
add(2,4,'Count with DO UNTIL','Use do/until to print 0 to 10 inclusive. The body runs before the condition is tested.',`n=0
do
 print(n)
 n=n+1
until n>10`,[['0–10',[],list(...range(11))]]);
add(2,5,'Smallest common multiple','Calculate the smallest positive integer divisible by every integer 1–10. Use loops and MOD. Stop checking a candidate as soon as a divisor fails; print the result.',`candidate=10
found=false
while NOT found
 found=true
 for divisor=1 to 10
  if candidate MOD divisor!=0 then
   found=false
   break
  endif
 next divisor
 if NOT found then
  candidate=candidate+10
 endif
endwhile
print(candidate)`,[['All ten divisors',[],['2520']]],{extension:true});
add(2,6,'Times tables','Read table number and final multiplier (positive integers). Print from 1 to that multiplier: “1 x 16 = 16” style.',`table=int(input("Table"))
last=int(input("Final multiplier"))
for n=1 to last
 print(str(n)+" x "+str(table)+" = "+str(n*table))
next n`,[['16 times table',['16','5'],range(5).map(i=>`${i+1} x 16 = ${(i+1)*16}`)],['One line',['7','1'],['1 x 7 = 7']]]);
add(2,7,'Collatz sequence','Read a positive integer. Print it; repeatedly halve even values (DIV 2), or calculate 3n+1 for odd values. Print each value and finish at 1.',`n=int(input("Start"))
print(n)
while n>1
 if n MOD 2==0 then
  n=n DIV 2
 else
  n=3*n+1
 endif
 print(n)
endwhile`,[['Start 6',['6'],list(6,3,10,5,16,8,4,2,1)],['Start 1',['1'],['1']],['Start 8',['8'],list(8,4,2,1)]]);
add(2,8,'Factors and primes','Read a positive integer. Print its factors in ascending order. If there are exactly two, append PRIME NUMBER!.',`n=int(input("Number"))
count=0
for factor=1 to n
 if n MOD factor==0 then
  print(factor)
  count=count+1
 endif
next factor
if count==2 then
 print("PRIME NUMBER!")
endif`,[['Prime',['13'],list(1,13,'PRIME NUMBER!')],['Composite',['48'],list(1,2,3,4,6,8,12,16,24,48)],['One',['1'],['1']]]);
add(2,9,'Chessboard pattern','Read a grid size (1–10). Print an alternating X/O grid without spaces. Top-left is X; each next row starts with the opposite character.',`size=int(input("Size"))
for row=0 to size-1
 line=""
 for col=0 to size-1
  if (row+col) MOD 2==0 then
   line=line+"X"
  else
   line=line+"O"
  endif
 next col
 print(line)
next row`,[['Five',['5'],['XOXOX','OXOXO','XOXOX','OXOXO','XOXOX']],['One',['1'],['X']],['Ten',['10'],range(10).map(i=>i%2?'OXOXOXOXOX':'XOXOXOXOXO')]],{extension:true});
add(3,1,'Upper and lower case','Read a name. Print UPPER: and its upper-case form, then lower: and its lower-case form. Include one space after each colon.',`name=input("Name")
print("UPPER: "+name.upper)
print("lower: "+name.lower)`,[['Andrew',['Andrew'],['UPPER: ANDREW','lower: andrew']],['Mixed case',['aDa'],['UPPER: ADA','lower: ada']]]);
add(3,2,'First two, last two','Read a word with at least two characters. Print first two + last two, upper case, then the length on the next line.',`word=input("Word")
print((word.left(2)+word.right(2)).upper)
print(word.length)`,[['Verity',['Verity'],['VETY','6']],['Andrew',['Andrew'],['ANEW','6']],['Two',['hi'],['HIHI','2']]]);
add(3,3,'Random character','Keep asking until the word has at least four characters. Print a random character from that word, then its length. The check accepts any character from the valid word.',`do
 word=input("Word (4+ characters)")
until word.length>=4
print(word[random(0,word.length-1)])
print(word.length)`,[['Valid',['Andrew'],['Any character from Andrew','6'],{validator:{kind:'random-character',word:'Andrew'}}],['Retry',['hi','Code'],['Any character from Code','4'],{validator:{kind:'random-character',word:'Code'}}]],{hints:['Use do/until to repeat validation.','String indexes start at zero.','random(0,word.length-1) produces an inclusive valid index.']});
add(3,4,'Split a long word','Read a word. Under 11 characters: print An invalid entry was made. Otherwise print first 3, next 3, next 5 characters, then length, with the labels shown.',`word=input("Word")
if word.length<11 then
 print("An invalid entry was made")
else
 print("FirstThree: "+word.subString(0,3))
 print("SecondThree: "+word.subString(3,3))
 print("NextFive: "+word.subString(6,5))
 print("Characters: "+str(word.length))
endif`,[['Valid',['OneTwoThreeFour'],['FirstThree: One','SecondThree: Two','NextFive: Three','Characters: 15']],['Short',['Hi'],['An invalid entry was made']],['Boundary',['abcdefghijk'],['FirstThree: abc','SecondThree: def','NextFive: ghijk','Characters: 11']]]);
add(3,5,'Character codes','Read menu choice 1/2. Choice 1: read a word and print each character code on a separate line. Choice 2: read a code (0–127) and print its character. Extension: convert a comma-separated list of codes into a word with split().',`choice=int(input("1 word to codes; 2 code to character"))
if choice==1 then
 word=input("Word")
 for i=0 to word.length-1
  print(ASC(word[i]))
 next i
else
 code=int(input("Code"))
 print(CHR(code))
endif`,[['Word',['1','Test'],list(84,101,115,116)],['Letter',['2','65'],['A']],['Quote',['2','34'],['"']]]);
add(3,6,'Almost the last three','Read a word of at least four characters. Print the three characters immediately before its last character, using the sentence shown.',`word=input("Word")
print("The almost last 3 letters are "+word.subString(word.length-4,3))`,[['Water',['Water'],['The almost last 3 letters are ate']],['Computer',['Computer'],['The almost last 3 letters are ute']],['Four',['abcd'],['The almost last 3 letters are abc']]]);
add(3,7,'One character per line','Read a word or phrase. Print each character in lower case on its own line. Preserve a space as a line containing one space. Extension: print the characters in reverse.',`word=input("Word or phrase").lower
for i=0 to word.length-1
 print(word[i])
next i`,[['Word',['Code'],['c','o','d','e']],['Space',['A B'],['a',' ','b']],['Empty',[''],[]]]);
add(3,8,'Palindrome detector','Read a word, ignore case, and compare with its reverse. Print the lower-case word plus “ is a palindrome” or “ is not a palindrome”.',`word=input("Word").lower
reverse=""
for i=word.length-1 to 0 step -1
 reverse=reverse+word[i]
next i
if word==reverse then
 print(word+" is a palindrome")
else
 print(word+" is not a palindrome")
endif`,[['Palindrome',['Racecar'],['racecar is a palindrome']],['Not one',['Andrew'],['andrew is not a palindrome']],['One letter',['A'],['a is a palindrome']]]);
add(3,9,'Longest run of C',"Read a string. Find the longest consecutive run of upper-case C characters. Print its length; if no C appears, print No C's in the provided string. Total frequency is different from a consecutive run.",`text=input("String")
best=0
run=0
for i=0 to text.length-1
 if text[i]=="C" then
  run=run+1
  best=max(best,run)
 else
  run=0
 endif
next i
if best==0 then
 print("No C's in the provided string")
else
 print(best)
endif`,[['Runs',['CCABCCCCCXCCC'],['5']],['Ten',['CCCCCCCCCC'],['10']],['Absent',['HELLO'],["No C's in the provided string"]],['One',['C'],['1']]]);
add(3,10,'Fictional username generator','Use fictional information. Read forename and surname (3+ characters each), then a memorable word (7+); retry invalid entries. Username = surname first 3 + forename last 3, lower case. Practice password = memorable first 3 + username first and last characters + memorable middle 2 (start at length DIV 2), lower case. Print username then practice password. This is a string exercise, not secure password design.',`do
 first=input("Fictional forename (3+)")
until first.length>=3
do
 last=input("Fictional surname (3+)")
until last.length>=3
do
 word=input("Memorable word (7+)").lower
until word.length>6
username=(last.left(3)+first.right(3)).lower
password=word.left(3)+username[0]+username[username.length-1]+word.subString(word.length DIV 2,2)
print(username)
print(password)`,[['Example',['Andrew','OHara','ComputerScience'],['oharew','comowrs']],['Retry',['Al','Alice','Li','Smith','short','Learning'],['smiice','leaseni']]],{extension:true});
const names=['Yoda','Even Piell','Saesee Tiin','Mace Windu','Plo Koon','Oppo Rancisis','Ki Adi Mundi'];
const colours=['Green','Green','Green','Purple','Blue','Green','Blue'];
const namesSetup='names='+JSON.stringify(names),charactersSetup='characters='+JSON.stringify(names.map((n,i)=>[n,colours[i]]));
add(4,1,'Arrays forwards and backwards','Print FORWARDS, then each name in the supplied array. Print a blank line, BACKWARDS, then each name in reverse.',`${namesSetup}
print("FORWARDS")
for i=0 to names.length-1
 print(names[i])
next i
print("")
print("BACKWARDS")
for i=names.length-1 to 0 step -1
 print(names[i])
next i`,[['Both directions',[],['FORWARDS',...names,'','BACKWARDS',...names.slice().reverse()]]],{setup:namesSetup});
add(4,2,'Search a one-dimensional array','Read a name; find its index in names. Print the sentence shown, or Element not recognised. Match names exactly.',`${namesSetup}
name=input("Name")
position=-1
for i=0 to names.length-1
 if names[i]==name then
  position=i
 endif
next i
if position<0 then
 print("Element not recognised")
else
 print(name+" is in the array at location "+str(position))
endif`,[['Missing',['Captain Kirk'],['Element not recognised']],['Middle',['Saesee Tiin'],['Saesee Tiin is in the array at location 2']],['Last',['Ki Adi Mundi'],['Ki Adi Mundi is in the array at location 6']]],{setup:namesSetup});
add(4,3,'Select from a two-dimensional array','Read row (0–6), then column (0–1). Print characters[row,column]. Invalid indexes print Element not recognised without indexing the array.',`${charactersSetup}
row=int(input("Row"))
col=int(input("Column"))
if row>=0 AND row<7 AND col>=0 AND col<2 then
 print(characters[row,col])
else
 print("Element not recognised")
endif`,[['Colour',['3','1'],['Purple']],['Name',['0','0'],['Yoda']],['Invalid',['20','-9'],['Element not recognised']],['Last',['6','1'],['Blue']]],{setup:charactersSetup});
add(4,4,'Print the colours','Print column 1 of characters, one colour per line; do not print names.',`${charactersSetup}
for row=0 to characters.length-1
 print(characters[row,1])
next row`,[['Colours',[],colours]],{setup:charactersSetup});
add(4,5,'Print the complete two-dimensional array','Print each name and colour on separate lines. Put one blank line between characters, with no final blank line.',`${charactersSetup}
for row=0 to characters.length-1
 print(characters[row,0])
 print(characters[row,1])
 if row<characters.length-1 then
  print("")
 endif
next row`,[['All characters',[],names.flatMap((n,i)=>i===names.length-1?[n,colours[i]]:[n,colours[i],''])]],{setup:charactersSetup});
const medians=[16,23,16,23,16,31,23,31,16,31,23,31,16,31,23,16];
const dataSetup='data='+JSON.stringify(medians.map(m=>[0,2,5,8,m-1,m,m+1,m+4,m+9,m+20,m+70]));
add(4,6,'Median of each row','The supplied data has 16 sorted rows of 11 numbers. Print each row’s median; calculate the middle column from row length.',`${dataSetup}
for row=0 to data.length-1
 print(data[row,data[row].length DIV 2])
next row`,[['Medians',[],list(...medians)]],{setup:dataSetup,fixtureNote:replacement});
const timetableSetup='timetable='+JSON.stringify([[['French','German','History'],['Geography','History','ICT'],['Computer Science','English','Maths']],[['ICT','Spanish','English'],['Food Technology','History','French'],['Computer Science','Geography','French']]]);
add(4,7,'Timetables in three dimensions','timetable is indexed [student,day,lesson]. Read day (0–2), lesson (0–2), then student (0–1). Print the subject; invalid indexes print Element not recognised.',`${timetableSetup}
day=int(input("Day"))
lesson=int(input("Lesson"))
student=int(input("Student"))
if day>=0 AND day<3 AND lesson>=0 AND lesson<3 AND student>=0 AND student<2 then
 print(timetable[student,day,lesson])
else
 print("Element not recognised")
endif`,[['Student 1',['1','1','1'],['History']],['Geography',['2','1','1'],['Geography']],['Student 0',['0','2','0'],['History']],['Invalid',['3','0','0'],['Element not recognised']]],{setup:timetableSetup});
const means=[5,8,12,16,21,22,24,39,55,58,59],meanSetup='data='+JSON.stringify(range(16).map(i=>means.map(m=>m+i%4-1)));
add(4,8,'Mean of each column','Use nested loops to total every column of the 16 × 11 data array. Divide by row count and round down with DIV or floor. Print the 11 results.',`${meanSetup}
for col=0 to data[0].length-1
 total=0
 for row=0 to data.length-1
  total=total+data[row,col]
 next row
 print(total DIV data.length)
next col`,[['Column means',[],list(...means)]],{setup:meanSetup,fixtureNote:replacement});
const playerSetup='player=[[1,15],[2,25],[1,100],[2,80],[1,120],[2,100],[1,120],[2,100]]';
add(4,9,'Laser tag totals','Each player row contains team (1 green, 2 red) and score. Total each team, print both totals and a blank line, then the winning team. Equal totals print Draw!.',`${playerSetup}
green=0
red=0
for i=0 to player.length-1
 if player[i,0]==1 then
  green=green+player[i,1]
 else
  red=red+player[i,1]
 endif
next i
print("The green team scored: "+str(green))
print("The red team scored: "+str(red))
print("")
if green>red then
 print("Green Team WINS!")
elseif red>green then
 print("Red Team WINS!")
else
 print("Draw!")
endif`,[['Match',[],['The green team scored: 355','The red team scored: 305','','Green Team WINS!']]],{setup:playerSetup,fixtureNote:replacement});
const airportSetup='airports=[["BCN","Barcelona International"],["LHR","London Heathrow"],["FCO","Rome, Fiumicino"],["CDG","Paris Charles de Gaulle"]]';
add(4,10,'Airport lookup','Read an airport code, ignoring case. Search airports and print its name, or Airport not found.',`${airportSetup}
code=input("Airport code").upper
name="Airport not found"
for i=0 to airports.length-1
 if airports[i,0]==code then
  name=airports[i,1]
 endif
next i
print(name)`,[['BOB','Airport not found'],['BCN','Barcelona International'],['lhr','London Heathrow'],['FCO','Rome, Fiumicino']].map(([c,n])=>[c,[c],[n]]),{setup:airportSetup,fixtureNote:replacement});
const tempSetup='temperatures='+JSON.stringify([...range(22).map(i=>i%11),...range(18).map(i=>11+i%10),...range(18).map(i=>21+i%10),...range(26).map(i=>31+i%9)]);
add(4,11,'Weather station','Count the 84 recorded integer temperatures in bands A ≤10, B 11–20, C 21–30, D ≥31. Print each count with the labels shown. This replacement data is an 84-day sample.',`${tempSetup}
a=0
b=0
c=0
d=0
for i=0 to temperatures.length-1
 t=temperatures[i]
 if t<=10 then
  a=a+1
 elseif t<=20 then
  b=b+1
 elseif t<=30 then
  c=c+1
 else
  d=d+1
 endif
next i
print("Band A: "+str(a))
print("Band B: "+str(b))
print("Band C: "+str(c))
print("Band D: "+str(d))`,[['Bands',[],['Band A: 22','Band B: 18','Band C: 18','Band D: 26']]],{setup:tempSetup,fixtureNote:replacement});
const purchases=[['Matt Pink Paint','decorating',6.99],['Floral Wallpaper','decorating',7.99],['Magnolia Gloss Paint','decorating',5.49],['Weed Killer','gardening',2.99],['Picture Frame','other',8.99],['Plug Socket','other',6.99],['Doorbell','other',15.99],['Matt White Paint','decorating',4.99],['Tiles','decorating',19.99],['Grass Seed','gardening',1.99],['Lawn Mower','gardening',129.99]];
const purchaseSetup='purchases='+JSON.stringify(purchases);
const receipt=['Matt Pink Paint £6.99','Floral Wallpaper £7.99','Magnolia Gloss Paint £5.49','Weed Killer £2.99','-£0.30 discount','Picture Frame £8.99','Plug Socket £6.99','Doorbell £15.99','Matt White Paint £4.99','Tiles £19.99','Grass Seed £1.99','-£0.20 discount','Lawn Mower £129.99','-£13.00 discount','--------------------','TOTAL: £198.89'];
add(4,12,'Decorating receipt','Spend at least £20 on decorating to get 10% off gardening. Rows: item, category, price. Total decorating spend first. Print the receipt; round each discount to two decimals before deducting. Use format(number,2) for prices.',`${purchaseSetup}
decorating=0
for i=0 to purchases.length-1
 if purchases[i,1]=="decorating" then
  decorating=decorating+purchases[i,2]
 endif
next i
total=0
for i=0 to purchases.length-1
 price=purchases[i,2]
 print(purchases[i,0]+" £"+format(price,2))
 discount=0
 if decorating>=20 AND purchases[i,1]=="gardening" then
  discount=round(price*0.1,2)
  print("-£"+format(discount,2)+" discount")
 endif
 total=total+price-discount
next i
print("--------------------")
print("TOTAL: £"+format(total,2))`,[['Receipt',[],receipt]],{setup:purchaseSetup,extension:true,fixtureNote:'Items and receipt transcribed from the worksheet; categories supplied by RecallStride.'});
const birdNames=['robin','blackbird','pigeon','magpie','bluetit','thrush','wren','starling'],birdSetup='birdName='+JSON.stringify(birdNames)+'\nbirdCount=[0,0,0,0,0,0,0,0]';
const birdSolution=`${birdSetup}
bird=input("Bird (x to finish)").lower
while bird!="x"
 found=false
 for i=0 to birdName.length-1
  if bird==birdName[i] then
   found=true
   count=int(input("Number observed"))
   birdCount[i]=birdCount[i]+count
  endif
 next i
 if NOT found then
  print("Bird species not in array")
 endif
 bird=input("Bird (x to finish)").lower
endwhile
for i=0 to birdName.length-1
 print(birdName[i]+":"+str(birdCount[i]))
next i`;
add(4,13,'Repair the bird watcher','Repair the starter to count repeated sightings and print all eight totals. Read bird, then count; x finishes. Unknown birds print Bird species not in array and ask for the next bird without consuming a count.',birdSolution,[['Repeat robin',['robin','22','robin','12','bluetit','13','x'],birdNames.map((n,i)=>`${n}:${i===0?34:i===4?13:0}`)],['Different birds',['robin','10','blackbird','9','pigeon','4','starling','1','x'],birdNames.map((n,i)=>`${n}:${({0:10,1:9,2:4,7:1})[i]||0}`)],['None',['x'],birdNames.map(n=>`${n}:0`)]],{kind:'Repair a program',extension:true});
TASKS.at(-1).starter=birdSolution.replace('birdCount=[0,0,0,0,0,0,0,0]','birdCount=[0,0,0,0,0,0,0]').replace('count=int(input("Number observed"))','count=input("Number observed")');
const planets=[['Mercury',58,4879,88,0],['Venus',108,12104,225,0],['Earth',150,12756,365,1],['Mars',228,6792,687,2],['Jupiter',779,142984,4333,67],['Saturn',1434,120536,10759,62],['Uranus',2871,51118,30687,27],['Neptune',4495,49528,59800,14]],planetSetup='planets='+JSON.stringify(planets);
const topTrumps=`${planetSetup}
userScore=0
aiScore=0
while userScore<10 AND aiScore<10
 user=random(0,planets.length-1)
 ai=random(0,planets.length-1)
 print("User Card")
 print("Planet: "+planets[user,0])
 print("Distance from Sun: "+str(planets[user,1])+" million km")
 print("Diameter: "+str(planets[user,2])+" km")
 print("Orbital period: "+str(planets[user,3])+" days")
 print("Moons: "+str(planets[user,4]))
 do
  criterion=int(input("Choose 1 distance, 2 diameter, 3 orbital period, 4 moons"))
 until criterion>=1 AND criterion<=4
 if planets[user,criterion]>planets[ai,criterion] then
  userScore=userScore+3
  print("Win")
 elseif planets[user,criterion]<planets[ai,criterion] then
  aiScore=aiScore+3
  print("Loss")
 else
  userScore=userScore+1
  aiScore=aiScore+1
  print("Draw")
 endif
 print("Computer card: "+planets[ai,0])
 print("User Score = "+str(userScore)+" AI Score = "+str(aiScore))
endwhile
if userScore>=10 AND aiScore>=10 then
 print("Game drawn!")
elseif userScore>=10 then
 print("User Wins!")
else
 print("AI Wins!")
endif`;
function gameExpected(seed,criterion){let state=seed,uScore=0,aScore=0;const out=[];const pick=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return planets[Math.floor((state>>>0)/4294967296*8)];};while(uScore<10&&aScore<10){const u=pick(),a=pick();out.push('User Card',`Planet: ${u[0]}`,`Distance from Sun: ${u[1]} million km`,`Diameter: ${u[2]} km`,`Orbital period: ${u[3]} days`,`Moons: ${u[4]}`);if(u[criterion]>a[criterion]){uScore+=3;out.push('Win');}else if(u[criterion]<a[criterion]){aScore+=3;out.push('Loss');}else{uScore++;aScore++;out.push('Draw');}out.push(`Computer card: ${a[0]}`,`User Score = ${uScore} AI Score = ${aScore}`);}out.push(uScore>=10&&aScore>=10?'Game drawn!':uScore>=10?'User Wins!':'AI Wins!');return out;}
add(4,14,'Planet Top Trumps','Each round: pick a random player and computer planet. Display all player data; ask criterion 1 distance, 2 diameter, 3 orbital period or 4 moons. Larger wins 3 points; a draw gives both 1. Reveal the computer card after comparison. Repeat until either score reaches 10; print the winner, or Game drawn! if both reach 10 together. Checks use a fixed random seed; Run uses a fresh seed.',topTrumps,[['Distance',Array(40).fill('1'),gameExpected(123456789,1)],['Moons',Array(40).fill('4'),gameExpected(123456789,4)]],{setup:planetSetup,extension:true,fixtureNote:'Fixed classroom planet dataset, including historical moon counts; figures are for this exercise.'});
const birds=['robin','magpie','chaffinch','eagle','thrush','sparrow','eagle','pigeon','eagle','swallow'];
add(5,1,'Eagle counter','Read virtual file birds; print every bird. Print a blank line and the sentence giving the eagle count. Use endOfFile() before reading.',`file=openRead("birds")
eagles=0
while NOT file.endOfFile()
 bird=file.readLine()
 print(bird)
 if bird=="eagle" then
  eagles=eagles+1
 endif
endwhile
file.close()
print("")
print("There were "+str(eagles)+" eagles found in the list.")`,[['Bird list',[],[...birds,'','There were 3 eagles found in the list.']],['Empty file',[],['','There were 0 eagles found in the list.'],{files:{birds:''}}]],{files:{birds:birds.join('\n')+'\n'},setup:'file=openRead("birds")'});
const verses=['Open the page and start to write','Build your program line by line','Check the loop and test the choice','Let the console show your voice','Read the file and count each row','Run again and watch it go'];
const verseSetup='verses='+JSON.stringify(verses);
add(5,2,'Karaoke file','Delete karaoke if it exists, then create it. Write the six supplied original classroom lines. Reopen and print each line followed by a blank line, with a one-second gap between verses using wait(1). Inspect the created file in Files.',`${verseSetup}
if existsFile("karaoke") then
 delFile("karaoke")
endif
newFile("karaoke")
f=open("karaoke")
for i=0 to verses.length-1
 f.writeLine(verses[i])
next i
f.close()
f=openRead("karaoke")
while NOT f.endOfFile()
 print(f.readLine())
 print("")
 if NOT f.endOfFile() then
  wait(1)
 endif
endwhile
f.close()`,[['Write and play',[],verses.flatMap(v=>[v,'']),{expectedFiles:{karaoke:verses.join('\n')+'\n'},expectedTimings:range(6).map(i=>i*1000)}],['Replace an old file',[],verses.flatMap(v=>[v,'']),{files:{karaoke:'old text\n'},expectedFiles:{karaoke:verses.join('\n')+'\n'},expectedTimings:range(6).map(i=>i*1000)}]],{setup:verseSetup,fixtureNote:'Original RecallStride classroom lines replace the song excerpt in the source worksheet.'});
const randomFile=`if existsFile("random") then
 delFile("random")
endif
newFile("random")
f=open("random")
count=random(10,30)
for i=1 to count
 f.writeLine(str(random(1,99)))
next i
f.close()
f=openRead("random")
odd=0
even=0
primes=0
single=0
double=0
total=0
while NOT f.endOfFile()
 n=int(f.readLine())
 total=total+1
 if n MOD 2==0 then
  even=even+1
 else
  odd=odd+1
 endif
 if n<10 then
  single=single+1
 else
  double=double+1
 endif
 prime=n>=2
 for d=2 to floor(sqrt(n))
  if n MOD d==0 then
   prime=false
  endif
 next d
 if prime then
  primes=primes+1
 endif
endwhile
f.close()
print("Odd numbers: "+str(odd))
print("Even numbers: "+str(even))
print("Prime numbers: "+str(primes))
print("One-digit numbers: "+str(single))
print("Two-digit numbers: "+str(double))
print("")
print("Total numbers generated: "+str(total))`;
add(5,3,'Random numbers in a file','Replace virtual file random with 10–30 randomly generated integers in 1–99, one per line. Reopen it; count odd, even, prime, one-digit, two-digit and total numbers. Print labels shown. Checks validate your counts against the actual generated file, so different random values are valid.',randomFile,[['Generated file',[],['Odd numbers: varies','Even numbers: varies','Prime numbers: varies','One-digit numbers: varies','Two-digit numbers: varies','','Total numbers generated: 10–30'],{validator:{kind:'random-file',file:'random'}}]],{extension:true});
const stateNames=['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];
const stateCodes='AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
const populations=stateNames.map((n,i)=>n==='California'?40000000:n==='Wyoming'?500000:1000000+i*100000);
const statesText=stateNames.map((n,i)=>`${n},${stateCodes[i]},${populations[i]}`).join('\n')+'\n';
const statesFiles={USStates:statesText};
const stateNote=replacement+' USStates contains name, two-letter code and fictional population; these are not current census figures.';
const qualifying=['Delaware','Georgia','Kentucky','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Pennsylvania','Tennessee','Texas','Vermont','West Virginia'];
add(5,4,'Filter US states','Read USStates (name,code,population). Print names starting with N OR whose second letter is e. Count the two conditions separately, including states satisfying both. Print the two totals with blank lines as shown.',`f=openRead("USStates")
startN=0
secondE=0
while NOT f.endOfFile()
 parts=f.readLine().split(",")
 name=parts[0]
 if name[0]=="N" then
  startN=startN+1
 endif
 if name[1]=="e" then
  secondE=secondE+1
 endif
 if name[0]=="N" OR name[1]=="e" then
  print(name)
 endif
endwhile
f.close()
print("")
print("There were "+str(startN)+" states starting with the letter n")
print("")
print("There were "+str(secondE)+" states with the second letter e")`,[['States',[],[...qualifying,'','There were 8 states starting with the letter n','','There were 14 states with the second letter e']]],{files:statesFiles,fixtureNote:stateNote});
const royalty=['William I','William II',...['I','II','III','IV','V','VI','VII','VIII'].map(n=>'Henry '+n),'Elizabeth I',...['I','II','III','IV','V','VI'].map(n=>'George '+n),'Elizabeth II'];
add(5,5,'Kings and queens','Read kings; print names whose first word is Henry or George. Count each, then print the totals as shown. Preserve file order.',`f=openRead("kings")
henry=0
george=0
while NOT f.endOfFile()
 name=f.readLine()
 first=name.split(" ")[0]
 if first=="Henry" then
  henry=henry+1
  print(name)
 elseif first=="George" then
  george=george+1
  print(name)
 endif
endwhile
f.close()
print("")
print("There were "+str(george)+" kings called George")
print("")
print("There were "+str(henry)+" kings called Henry.")`,[['Royalty',[],[...royalty.filter(n=>/^(Henry|George) /.test(n)),'','There were 6 kings called George','','There were 8 kings called Henry.']]],{files:{kings:royalty.join('\n')+'\n'},fixtureNote:replacement+' A selected list of names is supplied.'});
const elements=['Hydrogen','Helium','Lithium','Carbon','Oxygen','Sodium','Iron','Zinc','Tin','Gold','Praseodymium','Protactinium','Rutherfordium'];
add(5,6,'Chemical element filters','Read elements twice. First print names under 5 characters with second letter i. Next print names over 11 characters ending m. Finish with the two counts in the example order. This resolves the worksheet’s differing instruction/example order.',`f=openRead("elements")
short=0
while NOT f.endOfFile()
 name=f.readLine()
 if name.length>=2 AND name.length<5 AND name[1]=="i" then
  print(name)
  short=short+1
 endif
endwhile
f.close()
f=openRead("elements")
long=0
while NOT f.endOfFile()
 name=f.readLine()
 if name.length>11 AND name.right(1)=="m" then
  print(name)
  long=long+1
 endif
endwhile
f.close()
print("")
print("There were "+str(long)+" elements with more than 11 characters ending with the letter m.")
print("")
print("There were "+str(short)+" elements with less than 5 characters with the second letter i.")`,[['Elements',[],['Zinc','Tin','Praseodymium','Protactinium','Rutherfordium','','There were 3 elements with more than 11 characters ending with the letter m.','','There were 2 elements with less than 5 characters with the second letter i.']]],{files:{elements:elements.join('\n')+'\n'},fixtureNote:replacement+' Selected element names, not the complete periodic table.'});
const locations=['Go','Old Kent Road','Community Chest','Whitechapel Road','Income Tax','Kings Cross Station','The Angel Islington','Chance','Euston Road','Pentonville Road','Jail','Pall Mall','Electric Company','Whitehall','Northumberland Avenue','Marylebone Station','Bow Street','Community Chest','Marlborough Street','Vine Street','Free Parking','Strand','Chance','Fleet Street','Trafalgar Square','Fenchurch Street Station','Leicester Square','Coventry Street','Water Works','Piccadilly','Go To Jail','Regent Street','Oxford Street','Community Chest','Bond Street','Liverpool Street Station','Chance','Park Lane','Super Tax','Mayfair'];
const roads=locations.filter(n=>n.endsWith('Road')),squares=locations.filter(n=>n.endsWith('Square')),neither=locations.filter(n=>!n.endsWith('Road')&&!n.endsWith('Square'));
add(5,7,'Classify Monopoly locations','Read monopoly and create mono-roads, mono-squares and mono-neither. Replace existing output files. Classify each line by its ending Road, Square, or neither, preserving file order. Print the three counts with blank lines.',`road=openWrite("mono-roads")
square=openWrite("mono-squares")
other=openWrite("mono-neither")
f=openRead("monopoly")
r=0
s=0
o=0
while NOT f.endOfFile()
 name=f.readLine()
 if name.length>=4 AND name.right(4)=="Road" then
  road.writeLine(name)
  r=r+1
 elseif name.length>=6 AND name.right(6)=="Square" then
  square.writeLine(name)
  s=s+1
 else
  other.writeLine(name)
  o=o+1
 endif
endwhile
f.close()
road.close()
square.close()
other.close()
print("There were "+str(r)+" properties ending in Road")
print("")
print("There were "+str(s)+" properties ending in Square")
print("")
print("There were "+str(o)+" properties neither ending in Road or Square")`,[['Board',[],[`There were ${roads.length} properties ending in Road`,'',`There were ${squares.length} properties ending in Square`,'',`There were ${neither.length} properties neither ending in Road or Square`],{expectedFiles:{'mono-roads':roads.join('\n')+'\n','mono-squares':squares.join('\n')+'\n','mono-neither':neither.join('\n')+'\n'}}]],{files:{monopoly:locations.join('\n')+'\n'},fixtureNote:replacement});
const populationTotal=populations.reduce((a,b)=>a+b,0);
add(5,8,'State population statistics','USStates contains name, code and fictional classroom population. Calculate total, mean, largest and smallest state; print each state’s percentage of the total to two decimal places, with labels shown. Use all 50 rows.',`f=openRead("USStates")
array names[50]
array populations[50]
count=0
total=0
largest=0
smallest=0
while NOT f.endOfFile()
 parts=f.readLine().split(",")
 names[count]=parts[0]
 populations[count]=int(parts[2])
 total=total+populations[count]
 if populations[count]>populations[largest] then
  largest=count
 endif
 if populations[count]<populations[smallest] then
  smallest=count
 endif
 count=count+1
endwhile
f.close()
print("Total: "+str(total))
print("Average: "+format(total/count,2))
print("Highest: "+names[largest])
print("Lowest: "+names[smallest])
for i=0 to count-1
 print(names[i]+": "+format(populations[i]/total*100,2)+"%")
next i`,[['Statistics',[],[`Total: ${populationTotal}`,`Average: ${(populationTotal/50).toFixed(2)}`,'Highest: California','Lowest: Wyoming',...stateNames.map((n,i)=>`${n}: ${(populations[i]/populationTotal*100).toFixed(2)}%`)]]],{files:statesFiles,fixtureNote:stateNote,extension:true});
// The worksheet's optional game is a separate complete exercise.
const stateGame=`f=openRead("USStates")
array states[50,3]
count=0
while NOT f.endOfFile()
 parts=f.readLine().split(",")
 states[count,0]=parts[0]
 states[count,1]=parts[1]
 states[count,2]=int(parts[2])
 count=count+1
endwhile
f.close()
score=0
playing=true
while playing
 a=random(0,count-1)
 b=random(0,count-2)
 if b>=a then
  b=b+1
 endif
 print("1: "+states[a,0]+" ("+states[a,1]+")")
 print("2: "+states[b,0]+" ("+states[b,1]+")")
 answer=input("Which has the larger population? 1/2, or x to finish")
 if answer=="x" then
  playing=false
 else
  correct=(answer=="1" AND states[a,2]>states[b,2]) OR (answer=="2" AND states[b,2]>states[a,2])
  if correct then
   score=score+1
   print("Correct")
  else
   score=score-1
   print("Incorrect")
  endif
  print("Score: "+str(score))
 endif
endwhile
print("Final score: "+str(score))`;
// Independently calculate fixed-seed first cards, to check termination without guessing.
let randomState=123456789;function nextRandom(n){randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;return Math.floor((randomState>>>0)/4294967296*n);}
const firstCard=nextRandom(50);let secondCard=nextRandom(49);if(secondCard>=firstCard)secondCard++;
add(5,'8b','Higher or lower game','Use the fictional state populations to make a game. Randomly show two different states with codes. Ask which is larger (1/2); correct answers add 1 point, incorrect answers subtract 1. x ends the game. Print the running score and final score.',stateGame,[['Finish immediately',['x'],[`1: ${stateNames[firstCard]} (${stateCodes[firstCard]})`,`2: ${stateNames[secondCard]} (${stateCodes[secondCard]})`,'Final score: 0']]],{files:statesFiles,fixtureNote:stateNote,extension:true});
for(const category of categories){const grouped=TASKS.filter(t=>t.category===category);grouped.forEach((t,i)=>t.transferId=grouped[(i+1)%grouped.length].id);}
for(const task of LEGACY)TASKS.push({...task,category:'Extra practice',interpreterVersion:INTERPRETER,version:VERSION,files:{},fixtureNote:''});
module.exports={TASKS,VERSION,categories};
