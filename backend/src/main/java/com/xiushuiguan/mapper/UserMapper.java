package com.xiushuiguan.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xiushuiguan.entity.User;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<User> {
}
