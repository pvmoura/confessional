<<COMMENT1
rec -r 44100 -b 16 -c 1 -e signed-integer recording%1n.flac trim 0 00:10 : newfile : restart
rec -r 44100 -b 16 recording%1n.flac silence 1 0.0 0.1% 1 0.0 0.1% : newfile : restart
rm recording*.flac
COMMENT1
mv recording.flac oldFiles
rec -r 44100 -b 16 recording.flac
<<COMMENT1
sox -p recording%1n.flac silence 1 0.50 0.1% 1 00:01 0.1% : newfile : restart
COMMENT1
<<COMMENT1
sox acceptanceintro.flac ./silence/silence%n.flac silence 1.0 0.01t 3% 1 0.2t 3% : newfile : restart

sox acceptanceintro.flac trimmed%n.flac trim 0 8 : newfile : restart
COMMENT1
<<COMMENT1
for f in silence/*
do
    curl -u 3a223acf-c31e-403d-bca0-da88c124a99a:aEzxZ8KGNDVw -X POST --header "Content-Type: audio/flac" --header "Transfer Encoding: chunked" --data-binary @$f "https://stream.watsonplatform.net/speech-to-text/api/v1/recognize?continuous=true" >> result 
done
COMMENT1
