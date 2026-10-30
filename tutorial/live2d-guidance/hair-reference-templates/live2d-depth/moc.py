import struct,sys,json,os,glob
def parents(moc):
    b=open(moc,'rb').read()
    off=lambda i: struct.unpack_from('<I',b,64+4*i)[0]
    n=struct.unpack_from('<I',b,off(0))[0]
    pi=off(9); par=list(struct.unpack_from('<%di'%n,b,pi))
    idoff=off(3); ids=[b[idoff+64*k:idoff+64*k+64].split(b'\0')[0].decode() for k in range(n)]
    return ids,par
if __name__=='__main__':
    ids,par=parents(sys.argv[1]); print([(i,ids[p] if p>=0 else None) for i,p in zip(ids,par)])
